import importlib
import os
import sys
from pathlib import Path

# Nonaktifkan Gradio SSR (Node.js server) yang memicu error "Invalid port: '7862gradio_api...'"
os.environ["GRADIO_SSR_MODE"] = "false"

gr = importlib.import_module("gradio")

sys.path.insert(0, str(Path(__file__).resolve().parent))
fastapi_app = importlib.import_module("app.main").app

with gr.Blocks(title="NEXORA Guru Agent API") as demo:
    gr.Markdown("### NEXORA Guru Agent Backend is Running")
    gr.Markdown("FastAPI backend aktif di dalam Gradio Space.")

app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")