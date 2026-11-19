import io
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from googleapiclient.http import MediaIoBaseUpload

def get_classroom_service(user_oauth_token: str):
    """Membangun client Google Classroom menggunakan Token OAuth Guru."""
    creds = Credentials(token=user_oauth_token)
    return build('classroom', 'v1', credentials=creds)

def get_drive_service(user_oauth_token: str):
    """Membangun client Google Drive."""
    creds = Credentials(token=user_oauth_token)
    return build('drive', 'v3', credentials=creds)

def upload_file_to_drive(user_oauth_token: str, file_content: bytes, filename: str, mime_type: str) -> str:
    """Mengunggah berkas lokal ke Google Drive milik pengajar."""
    drive_service = get_drive_service(user_oauth_token)
    
    file_metadata = {'name': filename}
    media = MediaIoBaseUpload(io.BytesIO(file_content), mimetype=mime_type, resumable=True)
    
    uploaded_file = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()
    
    file_id = uploaded_file.get('id')
    
    # Berikan izin baca (reader) agar berkas bisa diakses siswa di Classroom
    permission = {'type': 'anyone', 'role': 'reader'}
    drive_service.permissions().create(fileId=file_id, body=permission).execute()
    
    return file_id

def create_classroom_coursework(
    service, 
    course_id: str, 
    title: str, 
    description: str, 
    due_date: dict = None, 
    due_time: dict = None,
    scheduled_time: str = None,  # String UTC format ISO 8601 (contoh: "2026-11-05T08:00:00Z")
    drive_file_id: str = None,
    link_url: str = None
):
    """Memposting tugas baru ke Google Classroom sebagai PUBLISHED atau DRAFT Terjadwal."""
    materials = []
    
    # Tambahkan lampiran Google Drive jika ada berkas yang diunggah
    if drive_file_id:
        materials.append({
            'driveFile': {
                'driveFile': {
                    'id': drive_file_id
                },
                'shareMode': 'VIEW'
            }
        })
        
    # Tambahkan lampiran Link (misal: Google Sheets Rekap)
    if link_url:
        materials.append({
            'link': {
                'url': link_url
            }
        })

    # Jika scheduled_time diisi, status tugas diset menjadi 'DRAFT'
    state = 'DRAFT' if scheduled_time else 'PUBLISHED'

    coursework = {
        'title': title,
        'description': description,
        'workType': 'ASSIGNMENT',
        'state': state,
        'materials': materials
    }
    
    if scheduled_time:
        coursework['scheduledTime'] = scheduled_time
    
    if due_date and due_time:
        coursework['dueDate'] = due_date
        coursework['dueTime'] = due_time

    return service.courses().courseWork().create(courseId=course_id, body=coursework).execute()

def create_classroom_material(service, course_id: str, title: str, description: str, link_url: str = None):
    """Memposting materi pembelajaran ke Google Classroom."""
    materials = []
    if link_url:
        materials.append({'link': {'url': link_url}})
        
    material_body = {
        'title': title,
        'description': description,
        'state': 'PUBLISHED',
        'materials': materials
    }
    return service.courses().courseWorkMaterials().create(courseId=course_id, body=material_body).execute()

def get_unsubmitted_classroom_students(service, course_id: str, coursework_id: str):
    """Mengambil daftar siswa yang belum menyerahkan tugas (Missing/Assigned)."""
    submissions = service.courses().courseWork().studentSubmissions().list(
        courseId=course_id, courseWorkId=coursework_id
    ).execute().get('studentSubmissions', [])

    students_list = service.courses().students().list(courseId=course_id).execute().get('students', [])
    student_dict = {s['userId']: s['profile']['name']['fullName'] for s in students_list}

    unsubmitted_students = []
    for sub in submissions:
        if sub.get('state') in ['CREATED', 'NEW', 'RECLAIMED_BY_STUDENT']:
            student_id = sub.get('userId')
            student_name = student_dict.get(student_id, "Siswa Tanpa Nama")
            unsubmitted_students.append(student_name)

    return {
        "total_students": len(submissions),
        "unsubmitted_count": len(unsubmitted_students),
        "unsubmitted_students": unsubmitted_students
    }

def get_all_teacher_coursework(service):
    """Mengambil seluruh tugas (PUBLISHED & DRAFT) dari semua kelas mengajar beserta statistik pengumpulan."""
    courses = service.courses().list(teacherId='me', courseStates=['ACTIVE']).execute().get('courses', [])
    all_tasks = []

    for course in courses:
        course_id = course.get('id')
        course_name = course.get('name')
        
        # Ambil total siswa di kelas ini
        students = service.courses().students().list(courseId=course_id).execute().get('students', [])
        total_students = len(students)

        # Ambil semua tugas (courseWork) termasuk yang masih DRAFT terjadwal
        courseworks = service.courses().courseWork().list(
            courseId=course_id,
            courseWorkStates=['PUBLISHED', 'DRAFT']
        ).execute().get('courseWork', [])

        for cw in courseworks:
            cw_id = cw.get('id')
            state = cw.get('state')

            # Hitung jumlah yang sudah mengumpulkan & sudah dinilai
            submissions = service.courses().courseWork().studentSubmissions().list(
                courseId=course_id,
                courseWorkId=cw_id
            ).execute().get('studentSubmissions', [])

            submitted_count = sum(1 for s in submissions if s.get('state') in ['TURNED_IN', 'RETURNED'])
            graded_count = sum(1 for s in submissions if s.get('assignedGrade') is not None)

            # Format deadline jika ada
            due_date = cw.get('dueDate')
            due_time = cw.get('dueTime')
            deadline_str = "Tanpa Tenggat"
            if due_date:
                day = f"{due_date.get('day', 1):02d}"
                month = f"{due_date.get('month', 1):02d}"
                year = due_date.get('year', 2026)
                hours = f"{due_time.get('hours', 23):02d}" if due_time else "23"
                minutes = f"{due_time.get('minutes', 59):02d}" if due_time else "59"
                deadline_str = f"{day}/{month}/{year}, {hours}:{minutes}"

            # Ambil link lampiran jika ada (misal Google Sheets)
            sheet_url = ""
            for mat in cw.get('materials', []):
                if 'link' in mat:
                    sheet_url = mat['link'].get('url', '')
                    break

            all_tasks.append({
                "id": cw_id,
                "courseId": course_id,
                "courseworkId": cw_id,
                "title": cw.get('title'),
                "subject": course.get('section') or "Google Classroom",
                "className": course_name,
                "deadline": deadline_str,
                "submittedCount": submitted_count,
                "totalStudents": total_students,
                "gradedCount": graded_count,
                "status": "Draft Terjadwal" if state == "DRAFT" else "Aktif",
                "sheetUrl": sheet_url
            })

    return all_tasks