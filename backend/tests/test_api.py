from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    """Menguji endpoint kesehatan API utama."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_generate_quiz_validation():
    """Menguji validasi input pada endpoint AI Quiz."""
    # Mengirim request tanpa parameter wajib
    response = client.post("/ai/generate-quiz", json={})
    assert response.status_code == 422  # Unprocessable Entity (Validasi Pydantic)