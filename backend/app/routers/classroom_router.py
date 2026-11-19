from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Form, UploadFile, File
from app.services.classroom_service import (
    get_classroom_service, 
    create_classroom_coursework, 
    create_classroom_material,
    get_unsubmitted_classroom_students,
    upload_file_to_drive,
    get_all_teacher_coursework
)

router = APIRouter(prefix="/api/classroom", tags=["Google Classroom"])

@router.get("/courses")
def get_teacher_courses(authorization: Optional[str] = Header(None)):
    """Mengambil daftar kelas di mana pengguna bertindak sebagai Pengajar (Mengajar)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Otentikasi Google Classroom diperlukan atau token tidak valid.")

    token = authorization.replace("Bearer ", "").strip()
    
    try:
        service = get_classroom_service(token)
        # Parameter teacherId='me' memastikan HANYA kelas kategori 'Mengajar' yang diambil
        results = service.courses().list(teacherId='me', courseStates=['ACTIVE']).execute()
        courses = results.get('courses', [])

        formatted_courses = [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "section": c.get("section", "")
            }
            for c in courses
        ]
        return {"courses": formatted_courses}
    except Exception as e:
        error_msg = str(e)
        # Jika token kedaluwarsa atau invalid dari sisi Google
        if "invalid_grant" in error_msg or "Token" in error_msg or "401" in error_msg:
            raise HTTPException(status_code=401, detail="Sesi Google Classroom kedaluwarsa. Silakan login kembali.")
        raise HTTPException(status_code=400, detail=f"Gagal mengambil kelas Classroom: {error_msg}")

@router.get("/coursework")
def list_all_coursework(authorization: Optional[str] = Header(None)):
    """Mengambil seluruh tugas (PUBLISHED & DRAFT) dari semua kelas mengajar di Google Classroom."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Otentikasi Google Classroom diperlukan atau token tidak valid.")

    token = authorization.replace("Bearer ", "").strip()
    
    try:
        service = get_classroom_service(token)
        tasks = get_all_teacher_coursework(service)
        return {"tasks": tasks}
    except Exception as e:
        error_msg = str(e)
        if "invalid_grant" in error_msg or "Token" in error_msg or "401" in error_msg:
            raise HTTPException(status_code=401, detail="Sesi Google Classroom kedaluwarsa. Silakan login kembali.")
        raise HTTPException(status_code=400, detail=f"Gagal memuat daftar tugas Classroom: {error_msg}")

@router.post("/post-assignment")
async def post_assignment(
    course_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(""),
    deadline: Optional[str] = Form(None),
    scheduled_at: Optional[str] = Form(None),  # Waktu rilis / buka tugas (ISO format dari frontend)
    sheet_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None)
):
    """Posting tugas baru ke Google Classroom sebagai PUBLISHED atau DRAFT Terjadwal."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Otentikasi Google Classroom diperlukan")

    token = authorization.replace("Bearer ", "").strip()
    
    try:
        service = get_classroom_service(token)
        
        # 1. Jika ada berkas lampiran lokal, unggah ke Google Drive terlebih dahulu
        drive_file_id = None
        if file:
            file_bytes = await file.read()
            drive_file_id = upload_file_to_drive(
                user_oauth_token=token,
                file_content=file_bytes,
                filename=file.filename,
                mime_type=file.content_type or 'application/octet-stream'
            )
        
        # 2. Parse tanggal deadline dari format datetime-local (YYYY-MM-DDTHH:MM)
        due_date = None
        due_time = None
        
        if deadline and "T" in deadline:
            date_part, time_part = deadline.split("T")
            year, month, day = map(int, date_part.split("-"))
            hours, minutes = map(int, time_part.split(":"))
            
            due_date = {'year': year, 'month': month, 'day': day}
            due_time = {'hours': hours, 'minutes': minutes}

        # 3. Format Waktu Rilis / Buka Tugas (ScheduledTime) ke UTC ISO 8601 string jika diisi
        iso_scheduled_time = None
        if scheduled_at and "T" in scheduled_at:
            dt_local = datetime.fromisoformat(scheduled_at)
            # Konversi waktu lokal browser/frontend ke ISO 8601 UTC string (format Z)
            iso_scheduled_time = dt_local.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # 4. Buat coursework di Google Classroom dengan scheduled_time, drive_file_id & sheet_url
        res = create_classroom_coursework(
            service=service, 
            course_id=course_id, 
            title=title, 
            description=description, 
            due_date=due_date, 
            due_time=due_time,
            scheduled_time=iso_scheduled_time,
            drive_file_id=drive_file_id,
            link_url=sheet_url
        )
        
        message = (
            "Tugas berhasil disimpan sebagai Draft Terjadwal di Google Classroom" 
            if iso_scheduled_time else 
            "Tugas dan lampiran berkas berhasil diposting ke Google Classroom"
        )
        
        return {
            "status": "success", 
            "message": message,
            "course_id": course_id,
            "classroom_coursework_id": res.get("id")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memposting tugas: {str(e)}")

@router.post("/post-material")
def post_material(
    course_id: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(""),
    link_url: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """Posting materi pembelajaran ke Google Classroom."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Otentikasi Google Classroom diperlukan")

    token = authorization.replace("Bearer ", "").strip()
    
    try:
        service = get_classroom_service(token)
        res = create_classroom_material(service, course_id, title, description, link_url)
        return {
            "status": "success", 
            "message": "Materi berhasil diposting ke Google Classroom",
            "classroom_material_id": res.get("id")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal memposting materi: {str(e)}")

@router.get("/unsubmitted/{course_id}/{coursework_id}")
def check_unsubmitted(course_id: str, coursework_id: str, authorization: Optional[str] = Header(None)):
    """Mengambil daftar siswa yang belum menyerahkan tugas (Missing/Assigned)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Otentikasi Google Classroom diperlukan")

    token = authorization.replace("Bearer ", "").strip()
    
    try:
        service = get_classroom_service(token)
        return get_unsubmitted_classroom_students(service, course_id, coursework_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal mengecek status pengumpulan: {str(e)}")