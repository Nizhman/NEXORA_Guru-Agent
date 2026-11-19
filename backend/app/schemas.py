from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

# --- SCHEMAS TUGAS (TASKS) ---
class TaskBase(BaseModel):
    title: str = Field(..., example="Input Nilai UH1 Sistem Informasi")
    description: Optional[str] = Field(None, example="Mengisi nilai tugas ke e-rapor")
    priority: str = Field("Sedang", example="Tinggi") # Rendah, Sedang, Tinggi
    status: str = Field("Belum Selesai", example="Belum Selesai") # Belum Selesai, Sedang Dikerjakan, Selesai
    deadline: Optional[datetime] = None

class TaskCreate(TaskBase):
    user_id: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime] = None

class TaskResponse(TaskBase):
    id: str
    user_id: str
    created_at: datetime

# --- SCHEMAS LESSON PLAN ---
class LessonPlanCreate(BaseModel):
    user_id: str
    subject: str
    grade: str
    topic: str
    duration: str
    content: str

class LessonPlanResponse(LessonPlanCreate):
    id: str
    created_at: datetime

# --- SCHEMAS QUIZ ---
class QuizCreate(BaseModel):
    user_id: str
    topic: str
    questions: List[Any]

class QuizResponse(QuizCreate):
    id: str
    created_at: datetime