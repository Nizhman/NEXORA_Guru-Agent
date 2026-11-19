import os
from pathlib import Path
from typing import List, Dict, Any
import gspread
from dotenv import dotenv_values
from google.oauth2.service_account import Credentials

# Path absolut langsung ke file backend/.env (sama persis dengan router lainnya)
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]


def _get_live_env(key: str, default: str = "") -> str:
    """Membaca langsung nilai terbaru dari backend/.env tanpa terpengaruh cache os.environ."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    val = env_data.get(key)
    if val is not None and str(val).strip() != "":
        return str(val).strip()
    return os.getenv(key, default).strip()


def get_credentials():
    """Mengambil kredensial service account secara dinamis."""
    default_creds_path = str(ENV_PATH.parent / "credentials" / "google_service_account.json")
    creds_path = _get_live_env("GOOGLE_SERVICE_ACCOUNT_FILE", default_creds_path)
    
    # Jika path relatif terhadap root backend
    if not os.path.isabs(creds_path):
        creds_path = str(ENV_PATH.parent / creds_path)

    if not os.path.exists(creds_path):
        raise FileNotFoundError(f"File kredensial tidak ditemukan di path: {creds_path}")
    
    return Credentials.from_service_account_file(creds_path, scopes=SCOPES)


def get_gspread_client() -> gspread.Client:
    credentials = get_credentials()
    return gspread.authorize(credentials)


def create_recap_sheet(title: str, headers: List[str]) -> Dict[str, str]:
    """Mengambil rujukan Google Sheet Master yang dikonfigurasi di .env secara dinamis."""
    try:
        sheet_id_raw = _get_live_env("GOOGLE_SHEET_TEMPLATE_ID")
        sheet_id = sheet_id_raw.split("/d/")[1].split("/")[0] if "/d/" in sheet_id_raw else sheet_id_raw

        if not sheet_id:
            raise ValueError("GOOGLE_SHEET_TEMPLATE_ID belum diisi di halaman Settings (.env)")

        return {
            "spreadsheet_id": sheet_id,
            "spreadsheet_url": f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
        }
    except Exception as e:
        raise RuntimeError(f"Gagal mengaitkan Google Sheet Master: {str(e)}")


def append_student_scores(spreadsheet_id: str, rows: List[List[Any]]) -> bool:
    """
    Mencari Nama Siswa di Kolom A, lalu menambahkan NILAI saja
    ke kolom kosong berikutnya secara horizontal (ke samping).
    """
    try:
        client = get_gspread_client()
        spreadsheet = client.open_by_key(spreadsheet_id)
        worksheet = spreadsheet.sheet1

        # Ambil seluruh baris data yang ada di sheet saat ini
        all_rows = worksheet.get_all_values()
        
        # Buat pemetaan Nama Siswa -> Nomor Baris (Case-insensitive & Trimmed)
        name_to_row_map = {}
        for index, row in enumerate(all_rows, start=1):
            if row and len(row) > 0:
                clean_name = row[0].strip().lower()
                name_to_row_map[clean_name] = index

        for item in rows:
            student_name = str(item[0]).strip()
            score = item[1]  # Hanya mengambil data nilai
            clean_student_name = student_name.lower()

            # 1. Jika Nama Siswa Ditemukan di Sheet
            if clean_student_name in name_to_row_map:
                row_idx = name_to_row_map[clean_student_name]
                row_values = worksheet.row_values(row_idx)
                
                # Masukkan nilai di kolom kosong paling kanan
                next_col_idx = len(row_values) + 1
                worksheet.update_cell(row_idx, next_col_idx, score)

            # 2. Jika Nama Siswa Belum Ada (Tambahkan baris baru: [Nama, Nilai])
            else:
                new_row = [student_name, score]
                worksheet.append_row(new_row)
                
                # Catat baris baru ke map lokal
                name_to_row_map[clean_student_name] = len(worksheet.get_all_values())

        return True
    except Exception as e:
        raise RuntimeError(f"Gagal memperbarui nilai di Google Sheet: {str(e)}")