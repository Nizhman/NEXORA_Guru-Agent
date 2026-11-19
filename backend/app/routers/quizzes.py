import os
from pathlib import Path
from dotenv import dotenv_values
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.schemas import QuizCreate, QuizResponse

# Path absolut langsung ke file backend/.env (sama persis dengan router lainnya)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


def _get_active_ai_info() -> Dict[str, str]:
    """Membaca langsung informasi model aktif dan preview API Key (masked) terbaru dari backend/.env."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    api_key = (env_data.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or "").strip()
    model_name = (env_data.get("GEMINI_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash").strip()

    if len(api_key) > 10:
        masked_key = f"{api_key[:6]}...{api_key[-4:]}"
    elif api_key:
        masked_key = "***"
    else:
        masked_key = "Belum Terpasang"

    return {
        "model_used": model_name,
        "api_key_preview": masked_key,
    }


@router.get("/ai-status")
def check_quiz_ai_status():
    """Endpoint cepat untuk mengecek model dan API Key Gemini yang sedang aktif."""
    return {
        "status": "ok",
        **_get_active_ai_info(),
    }


@router.get("/", response_model=List[QuizResponse])
def get_quizzes(user_id: str):
    """Mengambil riwayat kuis guru (tanpa Supabase)."""
    try:
        # Supabase telah dicopot. Mengembalikan list kosong.
        return []
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal mengambil riwayat kuis: {str(e)}",
        )


@router.post("/")
def save_quiz(quiz: QuizCreate) -> Dict[str, Any]:
    """Memproses kuis hasil AI beserta info model & API Key yang aktif (tanpa Supabase)."""
    try:
        ai_info = _get_active_ai_info()
        print(f"[QUIZ PROCESS] Memproses kuis | Model: {ai_info['model_used']} | API Key: {ai_info['api_key_preview']}")

        payload = quiz.model_dump(mode="json")

        # Supabase telah dicopot. Mengembalikan payload data langsung beserta info AI aktif.
        return {
            **payload,
            "id": payload.get("id", "local-quiz-id"),
            "ai_info": ai_info,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat memproses kuis: {str(e)}",
        )