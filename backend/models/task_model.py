from pydantic import BaseModel
from typing import List, Optional

class StudentStatus(BaseModel):
    student_id: str
    student_name: str
    has_submitted: bool = False
    score: Optional[float] = None

class CreateTaskRequest(BaseModel):
    title: str
    subject: str
    class_name: str
    deadline: str  # Format ISO Datetime
    sheet_url: Optional[str] = None
    students: List[str]  # Daftar nama siswa di kelas tersebut

class TaskResponse(BaseModel):
    id: str
    title: str
    subject: str
    class_name: str
    deadline: str
    total_students: int
    submitted_count: int
    unsubmitted_students: List[str]  # Siswa yang belum mengumpulkan