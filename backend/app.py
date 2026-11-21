import gradio as gr
from app.main import app as fastapi_app

with gr.Blocks(title="NEXORA Guru Agent API") as demo:
    gr.Markdown("### NEXORA Guru Agent Backend is Running")
    gr.Markdown("FastAPI backend aktif di dalam Gradio Space.")

app = gr.mount_gradio_app(demo, fastapi_app, path="/")