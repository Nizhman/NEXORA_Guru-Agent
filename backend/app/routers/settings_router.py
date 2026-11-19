import os
from pathlib import Path
from typing import Dict
from dotenv import dotenv_values, set_key
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Sesuaikan path ke backend/.env bila diperlukan
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/api/settings", tags=["Settings"])

KEYS: list[str] = [
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GOOGLE_APPS_SCRIPT_URL",
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    "GOOGLE_DRIVE_FOLDER_ID",
    "GOOGLE_SHEET_TEMPLATE_ID",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
]

DEFAULTS: Dict[str, str] = {
    "GEMINI_API_KEY": "",
    "GEMINI_MODEL": "gemini-3.5-flash",
    "GOOGLE_APPS_SCRIPT_URL": "",
    "GOOGLE_SERVICE_ACCOUNT_FILE": "credentials/google_service_account.json",
    "GOOGLE_DRIVE_FOLDER_ID": "",
    "GOOGLE_SHEET_TEMPLATE_ID": "",
    "GOOGLE_CLIENT_ID": "",
    "GOOGLE_CLIENT_SECRET": "",
    "GOOGLE_REDIRECT_URI": "http://localhost:8000/api/auth/google/callback",
}


class GoogleSettingsPayload(BaseModel):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    GOOGLE_APPS_SCRIPT_URL: str = ""
    GOOGLE_SERVICE_ACCOUNT_FILE: str = "credentials/google_service_account.json"
    GOOGLE_DRIVE_FOLDER_ID: str = ""
    GOOGLE_SHEET_TEMPLATE_ID: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"


def _read_all_settings() -> Dict[str, str]:
    file_env = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    result: Dict[str, str] = {}
    for key in KEYS:
        file_val = file_env.get(key)
        if file_val is not None and str(file_val).strip() != "":
            result[key] = str(file_val).strip()
        elif os.getenv(key) is not None and str(os.getenv(key)).strip() != "":
            result[key] = str(os.getenv(key)).strip()
        else:
            result[key] = DEFAULTS.get(key, "")
    return result


@router.get("/google")
def get_google_settings() -> Dict[str, str]:
    try:
        return _read_all_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca pengaturan: {str(e)}")


@router.put("/google")
def update_google_settings(payload: GoogleSettingsPayload):
    data = payload.model_dump()
    env_persisted = False

    try:
        # 1. Perbarui environment runtime di proses aktif
        for key, value in data.items():
            clean_val = (value or "").strip()
            os.environ[key] = clean_val

        # 2. Upayakan tulis ke file .env jika filesystem mengizinkan
        ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not ENV_PATH.exists():
            ENV_PATH.touch()

        for key, value in data.items():
            clean_val = (value or "").strip()
            set_key(str(ENV_PATH), key, clean_val, quote_mode="never")

        env_persisted = True
    except OSError:
        # Aman diabaikan di lingkungan cloud yang membatasi penulisan disk atau bersifat ephemeral
        env_persisted = False
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan pengaturan: {str(e)}")

    if env_persisted:
        msg = "Pengaturan berhasil disimpan ke .env dan diterapkan."
    else:
        msg = "Pengaturan diterapkan ke sesi aktif (file .env tidak ditulis; simpan variabel permanen di Environment dashboard hosting)."

    return {"status": "ok", "env_persisted": env_persisted, "message": msg}