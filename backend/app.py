
import importlib
import sys
from pathlib import Path

import gradio as gr

# Menambahkan root project ke Python path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

# Import FastAPI application
fastapi_app = importlib.import_module("app.main").app

# Membuat tampilan Gradio
with gr.Blocks(title="NEXORA Guru Agent API") as demo:
    gr.Markdown("# NEXORA Guru Agent")
    gr.Markdown(
        "Backend API NEXORA Guru Agent berhasil dijalankan."
    )
    gr.Markdown(
        "FastAPI backend aktif melalui Hugging Face Spaces."
    )

# Menggabungkan FastAPI dan Gradio
app = gr.mount_gradio_app(
    fastapi_app,
    demo,
    path="/"
)

# Menjalankan aplikasi
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        show_error=True
    )
