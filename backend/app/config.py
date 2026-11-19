import os
from pathlib import Path
from dotenv import dotenv_values

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"

def get_env(key: str, default: str = "") -> str:
    """Selalu membaca nilai paling baru langsung dari file backend/.env."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    val = env_data.get(key)
    if val is not None and str(val).strip() != "":
        return str(val).strip()
    return os.getenv(key, default).strip()