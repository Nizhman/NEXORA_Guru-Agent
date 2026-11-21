import os
from pathlib import Path
from dotenv import load_dotenv

# Tentukan path absolut ke file backend/.env secara presisi
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import (
    tasks,
    lesson_plans,
    quizzes,
    ai,
    quiz_export,
    grading,
    classroom_router,
    auth,
    settings_router,
)

app = FastAPI(
    title="TeachFlow AI API",
    description="Backend Service untuk Automation & AI Asisten Guru",
    version="1.0.0",
)

# Konfigurasi CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Seluruh Router
app.include_router(tasks.router)
app.include_router(lesson_plans.router)
app.include_router(quizzes.router)
app.include_router(ai.router)
app.include_router(quiz_export.router)
app.include_router(grading.router)
app.include_router(classroom_router.router)
app.include_router(auth.router)
app.include_router(settings_router.router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "TeachFlow AI Backend API",
        "documentation": "/docs",
    }