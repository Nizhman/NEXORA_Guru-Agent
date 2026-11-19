import io
import json
import os
from pathlib import Path
from typing import Union
import fitz  # PyMuPDF untuk merender halaman PDF bergambar menjadi gambar
from PIL import Image
from dotenv import dotenv_values
from google import genai
from google.genai import types

# Path absolut langsung ke file backend/.env (sama persis dengan settings_router.py)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

# Daftar model cadangan yang valid dan stabil
CANDIDATE_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"]


def _get_live_ai_config() -> tuple[str, str]:
    """Membaca langsung nilai terbaru dari backend/.env tanpa terpengaruh cache os.environ."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    api_key = (env_data.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or "").strip()
    model_name = (
        env_data.get("GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash"
    ).strip()
    return api_key, model_name


def _generate_content_with_fallback(
    contents, config: types.GenerateContentConfig = None
) -> tuple[str, str]:
    """
    Membaca GEMINI_API_KEY dan GEMINI_MODEL terbaru secara dinamis dari backend/.env.
    Mengembalikan tuple (response_text, actual_model_used).
    """
    current_api_key, preferred_model = _get_live_ai_config()
    if not current_api_key:
        raise ValueError(
            "GEMINI_API_KEY belum terpasang. Silakan atur pada halaman Settings."
        )

    dynamic_client = genai.Client(api_key=current_api_key)

    models_to_try = [preferred_model] + [
        m for m in CANDIDATE_MODELS if m != preferred_model
    ]

    last_exception = None
    for model_name in models_to_try:
        try:
            kwargs = {"model": model_name, "contents": contents}
            if config:
                kwargs["config"] = config

            response = dynamic_client.models.generate_content(**kwargs)
            return response.text, model_name
        except Exception as e:
            print(
                f"[AI FALLBACK] Model '{model_name}' gagal ({e}), beralih ke model berikutnya..."
            )
            last_exception = e
            continue

    raise last_exception


def generate_lesson_plan_ai(
    subject: str, grade: str, topic: str, duration: str
) -> tuple[str, str]:
    """Menghasilkan RPP terstruktur berbasis input guru beserta nama model aktual."""
    try:
        prompt = f"""
        Bertindaklah sebagai pakar kurikulum pendidikan. Buatkan Rencana Pelaksanaan Pembelajaran (RPP) yang rapi dan terstruktur dalam format Markdown.

        Detail Pembelajaran:
        - Mata Pelajaran: {subject}
        - Kelas/Tingkat: {grade}
        - Topik Materi: {topic}
        - Alokasi Waktu: {duration}

        Sertakan bagian:
        A. Tujuan Pembelajaran
        B. Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup)
        C. Asesmen/Penilaian
        """

        return _generate_content_with_fallback(prompt)
    except Exception as e:
        return f"Gagal menghasilkan RPP: {str(e)}", "failed"


def generate_quiz_ai(topic: str, count: int) -> tuple[list, str]:
    """Menghasilkan kuis berformat JSON terstruktur beserta nama model aktual."""
    try:
        prompt = f"""
        Buatkan {count} soal pilihan ganda tentang topik: '{topic}'.
        
        Kembalikan HANYA format JSON valid tanpa teks tambahan dengan struktur array berikut:
        [
          {{
            "id": 1,
            "question": "Pertanyaan...",
            "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
            "answer": "A. ...",
            "explanation": "Penjelasan rinci kunci jawaban..."
          }}
        ]
        """

        config = types.GenerateContentConfig(response_mime_type="application/json")

        response_text, actual_model = _generate_content_with_fallback(
            prompt, config=config
        )
        return json.loads(response_text), actual_model
    except Exception as e:
        return [{"error": f"Gagal membuat kuis: {str(e)}"}], "failed"


def evaluate_grading_ai(student_answer: str, rubric: str) -> tuple[dict, str]:
    """Mengevaluasi jawaban siswa berdasarkan rubrik beserta nama model aktual."""
    try:
        prompt = f"""
        Evaluasi jawaban siswa berikut berdasarkan rubrik penilaian yang diberikan.

        Rubrik Penilaian:
        {rubric}

        Jawaban Siswa:
        {student_answer}

        Berikan hasil evaluasi HANYA dalam format JSON valid dengan struktur:
        {{
          "score": 85,
          "feedback": "Penjelasan mengapa nilai ini diberikan dan poin yang perlu diperbaiki oleh siswa..."
        }}
        """

        config = types.GenerateContentConfig(response_mime_type="application/json")

        response_text, actual_model = _generate_content_with_fallback(
            prompt, config=config
        )
        return json.loads(response_text), actual_model
    except Exception as e:
        return {"score": 0, "feedback": f"Gagal evaluasi: {str(e)}"}, "failed"


def evaluate_grading_pdf_ai(pdf_bytes: bytes, rubric: str) -> tuple[dict, str]:
    """Menganalisis dokumen PDF multi-halaman / bergambar menggunakan Gemini AI Vision."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        image_parts = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            pil_img = Image.open(io.BytesIO(img_bytes))
            image_parts.append(pil_img)

        prompt = f"""
        Anda adalah Asisten Dosen yang profesional, objektif, dan teliti dalam menilai tugas mahasiswa.
        Berikut adalah rubrik penilaian yang harus Anda gunakan:
        
        === RUBRIK PENILAIAN ===
        {rubric}
        ========================

        Tugas mahasiswa dilampirkan dalam bentuk halaman-halaman dokumen PDF (bisa berisi teks, diagram, atau gambar). 
        Analisis isi dokumen tersebut secara menyeluruh, lalu berikan hasil evaluasi dalam format JSON valid (tanpa markdown backticks) dengan struktur berikut:
        {{
          "score": <angka nilai dari 0 hingga 100>,
          "summary": "<ringkasan evaluasi secara keseluruhan>",
          "strengths": "<kelebihan atau poin bagus dari pengerjaan mahasiswa>",
          "weaknesses": "<kekurangan atau kesalahan yang perlu diperbaiki>",
          "detailed_feedback": "<masukan/feedback konstruktif untuk mahasiswa>"
        }}
        """

        config = types.GenerateContentConfig(response_mime_type="application/json")

        contents = image_parts + [prompt]
        response_text, actual_model = _generate_content_with_fallback(
            contents, config=config
        )

        return json.loads(response_text), actual_model
    except Exception as e:
        return {
            "score": 0,
            "summary": f"Gagal memproses dokumen PDF: {str(e)}",
            "strengths": "-",
            "weaknesses": "-",
            "detailed_feedback": str(e),
        }, "failed"


def evaluate_grading_batch_ai(
    file_bytes: bytes, filename: str, mode: str, rubric: str
) -> tuple[Union[list, dict], str]:
    """Menganalisis batch seluruh halaman lembar jawaban (Gambar atau PDF) berdasarkan mode 'evaluate' atau 'extract'."""
    try:
        file_ext = filename.lower().split(".")[-1] if "." in filename else "jpg"
        contents_payload = []

        if file_ext == "pdf":
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                pil_img = Image.open(io.BytesIO(img_bytes))
                contents_payload.append(pil_img)
        else:
            pil_img = Image.open(io.BytesIO(file_bytes))
            contents_payload.append(pil_img)

        if mode == "evaluate":
            prompt = f"""
            Anda adalah Asisten Penilai Ujian profesional.
            Analisis SEMUA halaman atau gambar yang dilampirkan pada berkas ini. Setiap halaman bisa mewakili lembar jawaban siswa yang berbeda.
            Gunakan Kunci Jawaban / Rubrik berikut untuk mengevaluasi setiap siswa:
            ---
            {rubric}
            ---

            Instruksi Penting:
            1. Periksa setiap halaman dari awal hingga akhir tanpa ada yang terlewat.
            2. Untuk setiap siswa yang ditemukan, baca Nama Siswa, hitung total skor/nilai (skala 0 - 100), dan berikan ulasan/feedback singkat.

            Kembalikan jawaban HANYA dalam format JSON Array (daftar objek) valid tanpa teks tambahan:
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
        else:
            prompt = """
            Anda adalah sistem OCR dan ekstraksi data ujian yang sangat teliti.
            Analisis SEMUA halaman atau gambar yang dilampirkan pada berkas ini. Setiap halaman bisa mewakili lembar ujian milik siswa yang berbeda.

            Instruksi Penting:
            1. Periksa setiap halaman dari halaman pertama sampai halaman terakhir tanpa terlewat.
            2. Cari dan baca Nama Siswa serta Nilai / Angka Akhir yang sudah dilingkari atau dituliskan pada kertas di setiap halaman.
            3. Jangan melakukan evaluasi ulang, cukup ekstrak nama dan angka nilai yang tertera.

            Kembalikan jawaban HANYA dalam format JSON Array (daftar objek) valid tanpa teks tambahan:
            [
              {
                "student_name": "Nama Siswa 1",
                "score": 80,
                "feedback": "Nilai diekstraksi langsung dari kertas fisik"
              },
              {
                "student_name": "Nama Siswa 2",
                "score": 70,
                "feedback": "Nilai diekstraksi langsung dari kertas fisik"
              }
            ]
            """

        contents_payload.append(prompt)
        config = types.GenerateContentConfig(response_mime_type="application/json")
        response_text, actual_model = _generate_content_with_fallback(
            contents_payload, config=config
        )
        response_text = response_text.strip()

        if response_text.startswith("```"):
            response_text = response_text.strip("`").replace("json\n", "", 1).strip()

        return json.loads(response_text), actual_model
    except Exception as e:
        return [
            {
                "student_name": "Tidak Terbaca",
                "score": 0,
                "feedback": f"Gagal memproses berkas: {str(e)}",
            }
        ], "failed"