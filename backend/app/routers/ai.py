import io
import os
from pathlib import Path
from typing import Dict
from dotenv import dotenv_values
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
from docx import Document
from google import genai
from app.services.ai_service import (
    generate_lesson_plan_ai,
    generate_quiz_ai,
    evaluate_grading_ai,
)

# Path absolut langsung ke file backend/.env (sama persis dengan settings_router.py)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/ai", tags=["AI Integration"])

CANDIDATE_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"]


class LessonPlanRequest(BaseModel):
    subject: str
    grade: str
    topic: str
    duration: str


class QuizRequest(BaseModel):
    topic: str
    count: int = 3


class GradingRequest(BaseModel):
    student_answer: str
    rubric: str


def _get_live_ai_config() -> tuple[str, str]:
    """Membaca langsung nilai terbaru dari backend/.env tanpa terpengaruh cache os.environ."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    api_key = (env_data.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or "").strip()
    model_name = (
        env_data.get("GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash"
    ).strip()
    return api_key, model_name


def _build_ai_metadata(actual_model: str) -> Dict[str, object]:
    """Menyusun metadata model aktual yang sukses dipakai dan preview API Key (masked)."""
    api_key, configured_model = _get_live_ai_config()

    if len(api_key) > 10:
        masked_key = f"{api_key[:6]}...{api_key[-4:]}"
    elif api_key:
        masked_key = "***"
    else:
        masked_key = "Belum Terpasang"

    return {
        "model_used": actual_model,
        "configured_model": configured_model,
        "is_fallback": actual_model != configured_model,
        "api_key_preview": masked_key,
    }


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


@router.post("/generate-lesson-plan")
def api_generate_lesson_plan(req: LessonPlanRequest):
    content, actual_model = generate_lesson_plan_ai(
        req.subject, req.grade, req.topic, req.duration
    )
    return {
        "status": "success",
        **_build_ai_metadata(actual_model),
        "content": content,
    }


@router.post("/generate-quiz")
def api_generate_quiz(req: QuizRequest):
    questions, actual_model = generate_quiz_ai(req.topic, req.count)
    return {
        "status": "success",
        **_build_ai_metadata(actual_model),
        "questions": questions,
    }


@router.post("/grading-assistant")
def api_grading_assistant(req: GradingRequest):
    result, actual_model = evaluate_grading_ai(req.student_answer, req.rubric)
    return {
        "status": "success",
        **_build_ai_metadata(actual_model),
        "data": result,
    }


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
    current_api_key, preferred_model = _get_live_ai_config()
    if not current_api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY belum dikonfigurasi. Silakan atur pada halaman Settings.",
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

        dynamic_client = genai.Client(api_key=current_api_key)
        models_to_try = [preferred_model] + [
            m for m in CANDIDATE_MODELS if m != preferred_model
        ]

        raw_output = ""
        used_model = preferred_model
        last_exception = None

        for model_name in models_to_try:
            try:
                response = dynamic_client.models.generate_content(
                    model=model_name,
                    contents=analysis_prompt,
                )
                raw_output = response.text or ""
                used_model = model_name
                break
            except Exception as e:
                last_exception = e
                continue

        if not raw_output and last_exception:
            raise last_exception

        extracted_materials = ""
        generated_prompt = raw_output

        if "[BAHAN_KAJIAN]" in raw_output and "[PROMPT_PPT]" in raw_output:
            parts = raw_output.split("[PROMPT_PPT]")
            extracted_materials = parts[0].replace("[BAHAN_KAJIAN]", "").strip()
            generated_prompt = parts[1].strip()

        return {
            "status": "success",
            **_build_ai_metadata(used_model),
            "extracted_materials": extracted_materials,
            "prompt": generated_prompt,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal menganalisis dokumen: {str(e)}"
        )