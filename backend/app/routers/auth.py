import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from dotenv import dotenv_values

# Sesuaikan level parent dengan letak file .env (misal backend/.env)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _get_live_env(key: str, default: str = "") -> str:
    """Membaca nilai terbaru dari .env lalu fallback ke environment variable sistem."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    val = env_data.get(key)
    if val is not None and str(val).strip() != "":
        return str(val).strip()
    return os.getenv(key, default).strip()


def _get_backend_callback_uri() -> str:
    backend_url = _get_live_env("BACKEND_URL", "http://localhost:8000").rstrip("/")
    return f"{backend_url}/api/auth/google/callback"


def _get_frontend_url() -> str:
    return _get_live_env("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _get_client_config():
    """Membangun konfigurasi client secrets secara dinamis."""
    callback_uri = _get_backend_callback_uri()
    return {
        "web": {
            "client_id": _get_live_env("GOOGLE_CLIENT_ID", "YOUR_GOOGLE_CLIENT_ID"),
            "client_secret": _get_live_env("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [callback_uri],
        }
    }


SCOPES = [
    "https://www.googleapis.com/auth/classroom.courses.readonly",
    "https://www.googleapis.com/auth/classroom.coursework.students",
    "https://www.googleapis.com/auth/classroom.rosters.readonly",
    "https://www.googleapis.com/auth/drive.file",
    "openid",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
]


@router.get("/google")
def login_google():
    """Mengalihkan user ke halaman login OAuth Google."""
    try:
        client_config = _get_client_config()
        callback_uri = _get_backend_callback_uri()
        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=callback_uri,
        )
        flow.autogenerate_code_verifier = False

        authorization_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return RedirectResponse(url=authorization_url, status_code=302)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal menginisialisasi Google Login: {str(e)}")


@router.get("/google/callback")
def google_callback(code: str = Query(...)):
    """Menerima callback dari Google, menukar 'code' dengan 'access_token', lalu redirect ke Frontend."""
    try:
        client_config = _get_client_config()
        callback_uri = _get_backend_callback_uri()
        frontend_url = _get_frontend_url()

        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=callback_uri,
        )
        flow.autogenerate_code_verifier = False

        flow.fetch_token(code=code)
        credentials = flow.credentials
        access_token = credentials.token

        redirect_url = f"{frontend_url}/tasks?access_token={access_token}"
        return RedirectResponse(url=redirect_url, status_code=302)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Otentikasi Gagal: {str(e)}")