import io
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Union
from dotenv import dotenv_values
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from google import genai
from google.genai import types
from PIL import Image
import fitz  # PyMuPDF untuk merender seluruh halaman PDF menjadi gambar

from app.services.sheets_service import create_recap_sheet, append_student_scores

# Path absolut langsung ke file backend/.env (sama persis dengan settings_router.py & ai.py)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/ai/grading", tags=["AI Grading Assistant"])

# Daftar model cadangan yang valid dan stabil
CANDIDATE_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]


def _get_live_ai_config() -> tuple[str, str]:
    """Membaca langsung nilai terbaru dari backend/.env tanpa terpengaruh cache os.environ."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    api_key = (env_data.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or "").strip()
    model_name = (
        env_data.get("GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
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


def _call_gemini_multimodal(contents: list) -> tuple[str, str]:
    """Helper untuk memanggil Gemini API secara dinamis sesuai konfigurasi Settings (.env)."""
    current_api_key, preferred_model = _get_live_ai_config()
    if not current_api_key:
        raise ValueError("GEMINI_API_KEY belum terpasang. Silakan atur pada halaman Settings.")

    # Inisialisasi client secara dinamis agar langsung membaca perubahan API Key dari Settings
    dynamic_client = genai.Client(api_key=current_api_key)

    models_to_try = [preferred_model] + [m for m in CANDIDATE_MODELS if m != preferred_model]

    last_exception = None
    for model_name in models_to_try:
        try:
            config = types.GenerateContentConfig(
                response_mime_type="application/json"
            )
            response = dynamic_client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config
            )
            return response.text, model_name
        except Exception as e:
            print(f"[AI FALLBACK] Model '{model_name}' gagal ({e}), beralih ke model berikutnya...")
            last_exception = e
            continue
    raise last_exception


def analyze_file_with_gemini(file_bytes: bytes, filename: str, prompt: str) -> tuple[Union[list, dict], str]:
    """
    Mengolah berkas (Gambar PNG/JPG atau Dokumen PDF multi-halaman) 
    menggunakan Gemini Vision API dan mengembalikan (hasil JSON, nama model aktual).
    """
    try:
        file_ext = filename.lower().split(".")[-1] if "." in filename else "jpg"
        image_parts = []

        # Jika berkas adalah PDF, render SEMUA halamannya menjadi gambar
        if file_ext == "pdf":
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                pil_img = Image.open(io.BytesIO(img_bytes))
                image_parts.append(pil_img)
        else:
            # Jika berupa gambar biasa (JPG/PNG/JPEG)
            pil_img = Image.open(io.BytesIO(file_bytes))
            image_parts.append(pil_img)

        # Gabungkan seluruh halaman gambar ditambah prompt instruksi
        contents_payload = image_parts + [prompt]

        # Panggil Gemini API dengan mekanisme fallback
        text_response, actual_model = _call_gemini_multimodal(contents_payload)
        text_response = text_response.strip()

        # Membersihkan formatting markdown ```json ... ``` jika masih ada
        if text_response.startswith("```"):
            text_response = text_response.strip("`").replace("json\n", "", 1).strip()

        return json.loads(text_response), actual_model
    except Exception as e:
        print(f"Error Gemini Multimodal Processing: {str(e)}")
        return [
            {
                "student_name": "Tidak Terbaca",
                "score": 0,
                "feedback": f"Gagal memproses berkas: {str(e)}"
            }
        ], "failed"


@router.post("/process-batch")
async def process_grading_batch(
    mode: str = Form(...),                      # 'evaluate' atau 'extract'
    rubric: Optional[str] = Form(""),           # Kunci jawaban/rubrik
    create_new_sheet: bool = Form(True),      # Buat Sheet baru otomatis
    sheet_url: Optional[str] = Form(""),        # ID/URL Sheet jika create_new_sheet False
    files: List[UploadFile] = File(...)         # Berkas lembar jawaban (Gambar atau PDF multi-halaman)
):
    """
    Endpoint untuk memproses batch lembar jawaban siswa (mendukung Gambar dan PDF multi-halaman)
    menggunakan Gemini Vision dan merekap seluruh nilainya ke Google Sheets.
    """
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="Tidak ada berkas yang diunggah.")

    processed_results = []
    rows_for_sheets = []
    last_actual_model = "gemini-2.5-flash"

    for file in files:
        file_bytes = await file.read()
        filename = file.filename or "berkas.jpg"

        if mode == "evaluate":
            prompt = f"""
Anda adalah Asisten Penilai Ujian profesional.
Analisis SEMUA halaman atau gambar yang dilampirkan pada berkas ini. Setiap halaman bisa mewakili lembar jawaban siswa yang berbeda (atau satu kesatuan tugas).
Gunakan Kunci Jawaban / Rubrik berikut untuk mengevaluasi setiap siswa:
---
{rubric}
---

Instruksi Penting:
1. Periksa setiap halaman dari awal hingga akhir tanpa ada yang terlewat.
2. Untuk setiap siswa yang ditemukan, baca Nama Siswa, hitung nilai akhir (skala 0 - 100), dan berikan ulasan/feedback singkat tentang pemahamannya.
3. Kembalikan jawaban HANYA dalam format JSON Array (daftar objek) valid tanpa teks tambahan:
[
  {{
    "student_name": "Nama Siswa 1",
    "score": 85,
    "feedback": "Ulasan singkat pemahaman siswa"
  }},
  {{
    "student_name": "Nama Siswa 2",
    "score": 75,
    "feedback": "Ulasan singkat pemahaman siswa"
  }}
]
"""
        else:  # Mode 'extract'
            prompt = """
Anda adalah sistem OCR dan ekstraksi data ujian yang sangat teliti.
Analisis SEMUA halaman atau gambar yang dilampirkan pada berkas ini. Setiap halaman bisa mewakili lembar ujian milik siswa yang berbeda.

Instruksi Penting:
1. Periksa setiap halaman dari halaman pertama sampai halaman terakhir tanpa terlewat.
2. Baca Nama Siswa dan Nilai / Angka Akhir yang sudah dituliskan atau dilingkari oleh guru di setiap halaman (contoh: 80, 70, 90).
3. Jangan melakukan evaluasi ulang, cukup ekstrak nama dan angka nilai yang tertera.
4. Kembalikan jawaban HANYA dalam format JSON Array (daftar objek) valid tanpa teks tambahan:
[
  {
    "student_name": "Nama Siswa 1",
    "score": 80,
    "feedback": "Nilai diekstraksi dari kertas fisik"
  },
  {
    "student_name": "Nama Siswa 2",
    "score": 70,
    "feedback": "Nilai diekstraksi dari kertas fisik"
  }
]
"""

        result, actual_model = analyze_file_with_gemini(file_bytes, filename, prompt)
        if actual_model != "failed":
            last_actual_model = actual_model

        # Normalisasi hasil agar selalu berbentuk list berisi dict
        items_to_add = []
        if isinstance(result, list):
            items_to_add = result
        elif isinstance(result, dict):
            if "student_name" in result:
                items_to_add = [result]
            else:
                for val in result.values():
                    if isinstance(val, list):
                        items_to_add = val
                        break
        if not items_to_add:
            items_to_add = [{"student_name": "Tidak Terbaca", "score": 0, "feedback": str(result)}]

        for item in items_to_add:
            if not isinstance(item, dict):
                continue
            processed_results.append(item)
            if mode == "evaluate":
                rows_for_sheets.append([
                    item.get("student_name", "-"),
                    item.get("score", 0),
                    item.get("feedback", "-")
                ])
            else:
                rows_for_sheets.append([
                    item.get("student_name", "-"),
                    item.get("score", 0)
                ])

    # Simpan Rekap Hasil ke Google Sheets
    spreadsheet_info = {}
    try:
        if create_new_sheet:
            headers = ["Nama Siswa", "Nilai", "Analisis / Feedback"] if mode == "evaluate" else ["Nama Siswa", "Nilai"]
            spreadsheet_info = create_recap_sheet("Rekap Penilaian TeachFlow AI", headers)
            append_student_scores(spreadsheet_info["spreadsheet_id"], rows_for_sheets)
        elif sheet_url:
            sheet_id = sheet_url.split("/d/")[1].split("/")[0] if "/d/" in sheet_url else sheet_url
            append_student_scores(sheet_id, rows_for_sheets)
            spreadsheet_info = {"spreadsheet_id": sheet_id, "spreadsheet_url": sheet_url}
    except Exception as e:
        print(f"Error Google Sheets Sync: {str(e)}")

    return {
        "status": "success",
        **_build_ai_metadata(last_actual_model),
        "total_processed": len(processed_results),
        "results": processed_results,
        "spreadsheet": spreadsheet_info
    }