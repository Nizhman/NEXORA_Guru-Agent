import io
import os
from dotenv import load_dotenv
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pypdf import PdfReader
from docx import Document
from google import genai

load_dotenv()

# Pastikan GEMINI_API_KEY tersedia di file .env backend Anda
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

router = APIRouter(prefix="/ai", tags=["AI Tools"])


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Mengekstrak teks mentah dari dokumen PDF, DOCX (termasuk tabel RPS), atau TXT."""
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    text = ""

    if ext == "pdf":
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            text += (page.extract_text() or "") + "\n"
    elif ext == "docx":
        doc = Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs:
            if para.text.strip():
                text += para.text + "\n"
        # Ekstrak isi tabel (penting untuk format dokumen RPS)
        for table in doc.tables:
            for row in table.rows:
                row_text = [
                    cell.text.strip().replace("\n", " ")
                    for cell in row.cells
                    if cell.text.strip()
                ]
                if row_text:
                    text += " | ".join(row_text) + "\n"
    elif ext in ["txt", "md"]:
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError("Format file tidak didukung. Gunakan PDF, DOCX, atau TXT.")

    return text.strip()


@router.post("/analyze-ppt-material")
async def analyze_ppt_material(
    course_name: str = Form(...),
    topic: str = Form(...),
    slide_count: str = Form("10"),
    audience: str = Form("Mahasiswa"),
    style: str = Form("Akademik, terstruktur, visual & mudah dipahami"),
    file: UploadFile = File(...),
):
    """Menganalisis dokumen materi/RPS dan menghasilkan ringkasan bahan kajian serta prompt PPT."""
    if not client:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY belum dikonfigurasi pada file .env backend.",
        )

    try:
        file_bytes = await file.read()
        safe_filename = file.filename or "dokumen.txt"
        extracted_text = extract_text_from_file(file_bytes, safe_filename)

        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="Dokumen kosong atau teks tidak dapat dibaca.",
            )

        truncated_text = extracted_text[:15000]

        analysis_prompt = f"""
Anda adalah asisten dosen dan perancang kurikulum akademik.
Analisis isi dokumen materi/RPS berikut dan fokus pada topik: "{topic}" untuk mata kuliah "{course_name}".

=== ISI DOKUMEN ===
{truncated_text}
===================

Tugas Anda:
1. Ekstrak dan rangkum poin-poin **Bahan Kajian / Sub-Materi Utama** yang relevan dengan topik "{topic}" dari dokumen tersebut dalam bentuk bullet points yang jelas dan sistematis.
2. Susun sebuah **Prompt Lengkap Siap Pakai** yang akan ditempelkan ke NotebookLM / AI pembuat presentasi untuk menghasilkan {slide_count} slide PPT dengan target audiens "{audience}" dan gaya "{style}".

Format output Anda HARUS menggunakan pemisah persis seperti berikut:

[BAHAN_KAJIAN]
(tulis daftar bullet points bahan kajian hasil analisis dokumen di sini)

[PROMPT_PPT]
(tulis prompt lengkap dan terstruktur per slide untuk ditempel ke NotebookLM di sini, sudah mencakup identitas mata kuliah, bahan kajian hasil analisis, instruksi struktur setiap slide seperti Judul, Poin Isi, Saran Visual/Diagram, dan Speaker Notes)
"""

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=analysis_prompt,
        )
        raw_output = response.text or ""

        extracted_materials = ""
        generated_prompt = raw_output

        if "[BAHAN_KAJIAN]" in raw_output and "[PROMPT_PPT]" in raw_output:
            parts = raw_output.split("[PROMPT_PPT]")
            extracted_materials = parts[0].replace("[BAHAN_KAJIAN]", "").strip()
            generated_prompt = parts[1].strip()

        return {
            "status": "success",
            "extracted_materials": extracted_materials,
            "prompt": generated_prompt,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal menganalisis dokumen: {str(e)}"
        )