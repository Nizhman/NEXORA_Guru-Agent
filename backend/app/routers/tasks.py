import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from app.schemas import TaskCreate, TaskUpdate, TaskResponse

# Path absolut langsung ke file backend/.env (jika dibutuhkan di masa mendatang)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("/", response_model=List[TaskResponse])
def get_tasks(user_id: str):
    """Mengambil semua daftar tugas guru (tanpa Supabase)."""
    try:
        # Supabase telah dicopot. Mengembalikan list kosong.
        return []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal mengambil data tugas: {str(e)}"
        )


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate):
    """Membuat tugas baru (tanpa Supabase)."""
    try:
        task_data = task.model_dump()
        
        # Supabase telah dicopot. Mengembalikan data payload langsung dengan ID tiruan.
        return {
            "id": task_data.get("id", "local-task-id"),
            **task_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Terjadi kesalahan saat membuat tugas: {str(e)}"
        )


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, task_update: TaskUpdate):
    """Memperbarui data tugas berdasarkan ID (tanpa Supabase)."""
    try:
        update_data = task_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak ada data yang dikirim untuk diperbarui"
            )

        # Supabase telah dicopot. Mengembalikan respons sukses tiruan.
        return {
            "id": task_id,
            "title": update_data.get("title", "Updated Task"),
            **update_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal memperbarui data tugas: {str(e)}"
        )


@router.delete("/{task_id}")
def delete_task(task_id: str):
    """Menghapus tugas berdasarkan ID (tanpa Supabase)."""
    try:
        # Supabase telah dicopot. Mengembalikan respons sukses langsung.
        return {"status": "success", "message": f"Tugas '{task_id}' berhasil dihapus"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menghapus tugas: {str(e)}"
        )