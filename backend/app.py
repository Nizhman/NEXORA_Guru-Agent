import importlib
import os
import sys
from pathlib import Path
import spaces

os.environ["GRADIO_SSR_MODE"] = "false"

gr = importlib.import_module("gradio")

sys.path.insert(0, str(Path(__file__).resolve().parent))
fastapi_app = importlib.import_module("app.main").app


@spaces.GPU(duration=10)
def gpu_health_probe():
    return "ZeroGPU ready"


with gr.Blocks(title="NEXORA Guru Agent API") as demo:
    gr.Markdown("### NEXORA Guru Agent Backend is Running")
    gr.Markdown("FastAPI backend aktif di dalam Gradio Space.")
    status_out = gr.Textbox(label="ZeroGPU Status", interactive=False)
    probe_btn = gr.Button("Check GPU")
    probe_btn.click(fn=gpu_health_probe, outputs=status_out)

app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")