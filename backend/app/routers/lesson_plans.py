import os
from pathlib import Path
from dotenv import dotenv_values
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.schemas import LessonPlanCreate, LessonPlanResponse

# Path absolut langsung ke file backend/.env
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/lesson-plans", tags=["Lesson Plans"])


def _get_active_ai_info() -> Dict[str, str]:
    """Membaca informasi model aktif dan preview API Key (masked) secara langsung dari backend/.env."""
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
def check_lesson_plan_ai_status():
    """Endpoint cepat untuk mengecek model dan API Key Gemini yang sedang aktif untuk RPP."""
    return {
        "status": "ok",
        **_get_active_ai_info(),
    }


@router.get("/", response_model=List[LessonPlanResponse])
def get_lesson_plans(user_id: str):
    """Mengambil riwayat RPP guru (tanpa Supabase)."""
    try:
        # Supabase telah dicopot. Anda dapat mengembalikan list kosong atau data lokal jika diperlukan.
        return []
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal mengambil riwayat RPP: {str(e)}",
        )


@router.post("/")
def save_lesson_plan(plan: LessonPlanCreate) -> Dict[str, Any]:
    """Memproses atau merespons penyimpanan RPP hasil AI beserta informasi model & API Key aktif."""
    try:
        ai_info = _get_active_ai_info()
        print(f"[LESSON PLAN PROCESS] Memproses RPP | Model: {ai_info['model_used']} | API Key: {ai_info['api_key_preview']}")

        payload = plan.model_dump(mode="json")

        # Supabase telah dicopot. Mengembalikan payload data langsung beserta info AI aktif.
        return {
            **payload,
            "id": payload.get("id", "local-id-generated"),
            "ai_info": ai_info,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Terjadi kesalahan saat memproses RPP: {str(e)}",
        )