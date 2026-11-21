import importlib
import sys
from pathlib import Path

gr = importlib.import_module("gradio")

sys.path.insert(0, str(Path(__file__).resolve().parent))
fastapi_app = importlib.import_module("app.main").app

with gr.Blocks(title="NEXORA Guru Agent API") as demo:
    gr.Markdown("### NEXORA Guru Agent Backend is Running")
    gr.Markdown("FastAPI backend aktif di dalam Gradio Space.")

app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)