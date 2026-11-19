import io
import os
from pathlib import Path
from datetime import datetime
from dotenv import dotenv_values
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import requests
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    KeepTogether, Flowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER

# Path absolut langsung ke file backend/.env (sama persis dengan router lainnya)
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"

router = APIRouter(prefix="/ai/quiz", tags=["AI Quiz Export"])

class QuizQuestion(BaseModel):
    id: Optional[int] = None
    question: str
    options: List[str]
    answer: str
    explanation: str

class ExportQuizRequest(BaseModel):
    topic: str
    subject: Optional[str] = "Sistem Informasi"
    grade: Optional[str] = ""
    questions: List[QuizQuestion]


# ============================================================
# PALET WARNA (Monokrom Elegan - Print Friendly)
# ============================================================
C_BLACK = colors.HexColor("#000000")
C_DARK  = colors.HexColor("#1A1A1A")


def _get_live_env(key: str, default: str = "") -> str:
    """Membaca langsung nilai terbaru dari backend/.env tanpa terpengaruh cache os.environ."""
    env_data = dotenv_values(ENV_PATH) if ENV_PATH.exists() else {}
    val = env_data.get(key)
    if val is not None and str(val).strip() != "":
        return str(val).strip()
    return os.getenv(key, default).strip()


# ============================================================
# HELPER: Garis Ganda Premium (Double Line)
# ============================================================
class PremiumDoubleLine(Flowable):
    """Garis ganda tebal-tipis khas kop dokumen resmi."""
    def __init__(self, width, thickness_outer=2.5, thickness_inner=0.8, gap=3.0):
        Flowable.__init__(self)
        self.width = width
        self.thickness_outer = thickness_outer
        self.thickness_inner = thickness_inner
        self.gap = gap

    def draw(self):
        # Garis tebal atas
        self.canv.setStrokeColor(C_BLACK)
        self.canv.setLineWidth(self.thickness_outer)
        self.canv.line(0, 0, self.width, 0)
        # Garis tipis bawah
        self.canv.setLineWidth(self.thickness_inner)
        self.canv.line(0, -self.gap, self.width, -self.gap)


# ============================================================
# DOCX EXPORT (Format Ujian Formal Premium)
# ============================================================
@router.post("/export/docx")
def export_quiz_docx(payload: ExportQuizRequest):
    """Mengekspor kuis ke format Microsoft Word (.docx) formal."""
    try:
        doc = Document()

        section = doc.sections[0]
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

        # 1. Kop Dokumen
        p_head = doc.add_paragraph()
        p_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        run_1 = p_head.add_run("PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA\n")
        run_1.font.name = "Times New Roman"
        run_1.font.size = Pt(12)
        run_1.font.bold = True

        run_2 = p_head.add_run("DINAS PENDIDIKAN DAN KEBUDAYAAN\n")
        run_2.font.name = "Times New Roman"
        run_2.font.size = Pt(13)
        run_2.font.bold = True

        run_3 = p_head.add_run("SMA NEGERI 1 JAKARTA\n")
        run_3.font.name = "Times New Roman"
        run_3.font.size = Pt(15)
        run_3.font.bold = True

        run_4 = p_head.add_run("Alamat: Jl. Pendidikan No. 1, Jakarta  &nbsp;|&nbsp; Email: info@sman1jakarta.sch.id\n")
        run_4.font.name = "Times New Roman"
        run_4.font.size = Pt(9)
        
        # 2. Garis Ganda (Double Border)
        div = doc.add_paragraph()
        pPr = div._p.get_or_add_pPr()
        pBdr = OxmlElement('w:pBdr')
        bottom = OxmlElement('w:bottom')
        bottom.set(qn('w:val'), 'double')
        bottom.set(qn('w:sz'), '8')
        bottom.set(qn('w:space'), '4')
        bottom.set(qn('w:color'), '000000')
        pBdr.append(bottom)
        pPr.append(pBdr)

        doc.add_paragraph()

        # 3. Judul Ujian
        p_title = doc.add_paragraph()
        p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p_title.add_run("SOAL UJIAN SEKOLAH\n")
        r1.font.name = "Times New Roman"
        r1.font.size = Pt(14)
        r1.font.bold = True
        
        current_year = datetime.now().year
        school_year = f"{current_year}/{current_year + 1}"

        r2 = p_title.add_run(f"TAHUN PELAJARAN {school_year}\n")
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(12)
        r2.font.bold = True
        
        r3 = p_title.add_run(f"(Topik: {payload.topic})")
        r3.font.name = "Times New Roman"
        r3.font.size = Pt(11)
        r3.font.italic = True

        doc.add_paragraph()

        # 4. Tabel Identitas
        table = doc.add_table(rows=4, cols=3)
        table.autofit = False
        table.columns[0].width = Inches(1.6)
        table.columns[1].width = Inches(0.2)
        table.columns[2].width = Inches(4.5)

        labels = [
            "Mata Pelajaran", 
            "Hari / Tanggal", 
            "Nama Peserta", 
            "Kelas"
        ]
        values = [
            payload.subject or "-",
            datetime.now().strftime("%A, %d %B %Y"),
            ".......................................................................",
            "......................................................................."
        ]

        for i in range(4):
            row = table.rows[i]
            row.cells[0].text = labels[i]
            row.cells[1].text = ":"
            row.cells[2].text = values[i]
            
            for cell in row.cells:
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                for p in cell.paragraphs:
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Times New Roman"
                        r.font.size = Pt(11)

        doc.add_paragraph()

        # 5. Banner Selamat Mengerjakan
        p_banner = doc.add_paragraph()
        p_banner.alignment = WD_ALIGN_PARAGRAPH.CENTER
        rb = p_banner.add_run('"SELAMAT MENGERJAKAN"')
        rb.font.name = "Times New Roman"
        rb.font.size = Pt(12)
        rb.font.bold = True
        rb.font.italic = True

        p_inst = doc.add_paragraph()
        ri = p_inst.add_run("I. Berilah tanda silang (X) pada jawaban a, b, c, atau d yang paling tepat !!!")
        ri.font.name = "Times New Roman"
        ri.font.size = Pt(11)
        ri.font.bold = True

        doc.add_paragraph()

        # 6. Soal & Pilihan
        for idx, q in enumerate(payload.questions, 1):
            qp = doc.add_paragraph()
            qp.paragraph_format.space_after = Pt(4)
            qp.paragraph_format.line_spacing = 1.15
            qr = qp.add_run(f"{idx}. {q.question}")
            qr.font.name = "Times New Roman"
            qr.font.size = Pt(11)

            alphabet = ["a", "b", "c", "d", "e"]
            for i, opt in enumerate(q.options or []):
                op = doc.add_paragraph()
                op.paragraph_format.left_indent = Inches(0.3)
                op.paragraph_format.space_after = Pt(2)
                op.paragraph_format.line_spacing = 1.15
                ob = op.add_run(f"{alphabet[i] if i < 5 else '-'}. {opt}")
                ob.font.name = "Times New Roman"
                ob.font.size = Pt(11)
            
            doc.add_paragraph().paragraph_format.space_after = Pt(6)

        file_stream = io.BytesIO()
        doc.save(file_stream)
        file_stream.seek(0)

        filename = f"Kuis_{payload.topic.replace(' ', '_')}.docx"
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal ekspor Word: {str(e)}")


# ============================================================
# PDF EXPORT (Format Ujian Formal Premium)
# ============================================================
@router.post("/export/pdf")
def export_quiz_pdf(payload: ExportQuizRequest):
    """Mengekspor kuis ke format PDF formal seperti lembar soal ujian nasional (Premium)."""
    try:
        file_stream = io.BytesIO()
        doc = SimpleDocTemplate(
            file_stream,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40,
            title=f"Ujian - {payload.topic}",
            author="",
            subject="Lembar Soal Ujian",
        )
        styles = getSampleStyleSheet()
        story = []

        kop_style_1 = ParagraphStyle('Kop1', fontName='Helvetica-Bold', fontSize=11, textColor=C_BLACK, alignment=TA_CENTER, leading=14)
        kop_style_2 = ParagraphStyle('Kop2', fontName='Helvetica-Bold', fontSize=13, textColor=C_BLACK, alignment=TA_CENTER, leading=16)
        kop_style_3 = ParagraphStyle('Kop3', fontName='Helvetica-Bold', fontSize=16, textColor=C_BLACK, alignment=TA_CENTER, leading=20)
        kop_style_4 = ParagraphStyle('Kop4', fontName='Helvetica', fontSize=8.5, textColor=C_BLACK, alignment=TA_CENTER, leading=11)
        
        title_style = ParagraphStyle('TitleX', fontName='Helvetica-Bold', fontSize=14, textColor=C_BLACK, alignment=TA_CENTER, leading=17)
        subtitle_style = ParagraphStyle('SubX', fontName='Helvetica-Bold', fontSize=11, textColor=C_BLACK, alignment=TA_CENTER, leading=14)
        topic_style = ParagraphStyle('TopicX', fontName='Helvetica-Oblique', fontSize=10, textColor=C_BLACK, alignment=TA_CENTER, leading=13)
        
        meta_label = ParagraphStyle('MetaL', fontName='Helvetica-Bold', fontSize=10, textColor=C_BLACK, leading=15)
        meta_val = ParagraphStyle('MetaV', fontName='Helvetica', fontSize=10, textColor=C_BLACK, leading=15)
        
        banner_style = ParagraphStyle('Banner', fontName='Helvetica-Bold', fontSize=11, textColor=C_BLACK, alignment=TA_CENTER, spaceBefore=8, spaceAfter=8)
        instruction_style = ParagraphStyle('Inst', fontName='Helvetica-Bold', fontSize=10, textColor=C_BLACK, leading=14, spaceAfter=10)
        
        q_text_style = ParagraphStyle('QText', fontName='Helvetica', fontSize=10, textColor=C_BLACK, leading=15, alignment=TA_JUSTIFY)
        opt_style = ParagraphStyle('OptX', fontName='Helvetica', fontSize=10, textColor=C_BLACK, leading=14)

        # 1. KOP DOKUMEN
        story.append(Paragraph("PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA", kop_style_1))
        story.append(Paragraph("DINAS PENDIDIKAN DAN KEBUDAYAAN", kop_style_2))
        story.append(Paragraph("SMA NEGERI 1 JAKARTA", kop_style_3))
        story.append(Paragraph("Alamat: Jl. Pendidikan No. 1, Jakarta &nbsp;|&nbsp; Email: info@sman1jakarta.sch.id", kop_style_4))
        story.append(Spacer(1, 6))
        story.append(PremiumDoubleLine(532, thickness_outer=2.0, thickness_inner=0.8, gap=2.5))
        story.append(Spacer(1, 16))

        # 2. JUDUL UJIAN
        current_year = datetime.now().year
        school_year = f"{current_year}/{current_year + 1}"
        
        story.append(Paragraph("SOAL UJIAN SEKOLAH", title_style))
        story.append(Paragraph(f"TAHUN PELAJARAN {school_year}", subtitle_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"(Topik: {payload.topic})", topic_style))
        story.append(Spacer(1, 20))

        # 3. TABEL IDENTITAS SISWA
        today_str = datetime.now().strftime("%A, %d %B %Y")
        identity_data = [
            [Paragraph("Mata Pelajaran", meta_label), Paragraph(":", meta_val), Paragraph(payload.subject or "-", meta_val)],
            [Paragraph("Hari / Tanggal", meta_label), Paragraph(":", meta_val), Paragraph(today_str, meta_val)],
            [Paragraph("Nama Peserta", meta_label), Paragraph(":", meta_val), Paragraph(".......................................................................", meta_val)],
            [Paragraph("Kelas", meta_label), Paragraph(":", meta_val), Paragraph(".......................................................................", meta_val)],
        ]
        identity_table = Table(identity_data, colWidths=[110, 15, 407])
        identity_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(identity_table)
        story.append(Spacer(1, 20))

        # 4. BANNER & INSTRUKSI
        story.append(HRFlowable(width="100%", thickness=0.6, color=C_BLACK, spaceBefore=0, spaceAfter=0))
        story.append(Paragraph('"SELAMAT MENGERJAKAN"', banner_style))
        story.append(HRFlowable(width="100%", thickness=0.6, color=C_BLACK, spaceBefore=0, spaceAfter=12))
        
        story.append(Paragraph("I. &nbsp; Berilah tanda silang (X) pada jawaban a, b, c, atau d yang paling tepat !!!", instruction_style))
        story.append(Spacer(1, 6))

        # 5. DAFTAR SOAL
        for idx, q in enumerate(payload.questions, 1):
            q_elements = []

            q_elements.append(Paragraph(f"<b>{idx}.</b> &nbsp;{q.question}", q_text_style))
            q_elements.append(Spacer(1, 4))

            alphabet = ["a", "b", "c", "d", "e"]
            opts = q.options or []
            rows = []
            
            if len(opts) <= 2:
                row = []
                for i in range(2):
                    if i < len(opts):
                        row.append(Paragraph(f"{alphabet[i]}. &nbsp;{opts[i]}", opt_style))
                    else:
                        row.append(Paragraph("", opt_style))
                rows.append(row)
            else:
                mid = (len(opts) + 1) // 2
                for i in range(mid):
                    left_idx = i
                    right_idx = i + mid
                    
                    left_text = f"{alphabet[left_idx]}. &nbsp;{opts[left_idx]}" if left_idx < len(opts) else ""
                    right_text = f"{alphabet[right_idx]}. &nbsp;{opts[right_idx]}" if right_idx < len(opts) else ""
                    
                    rows.append([
                        Paragraph(left_text, opt_style),
                        Paragraph(right_text, opt_style)
                    ])

            if rows:
                opt_table = Table(rows, colWidths=[190, 332])
                opt_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (0, -1), 20),
                    ('LEFTPADDING', (1, 0), (1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 1),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ]))
                q_elements.append(opt_table)
            
            q_elements.append(Spacer(1, 12))
            story.append(KeepTogether(q_elements))

        doc.build(story)
        file_stream.seek(0)

        filename = f"Kuis_{payload.topic.replace(' ', '_')}.pdf"
        return StreamingResponse(
            file_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        print(f"Error PDF Export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Gagal ekspor PDF: {str(e)}")


@router.post("/export/gform")
def export_quiz_gform(payload: ExportQuizRequest):
    """Mengirim data kuis ke Google Apps Script Webhook untuk membuat Google Form secara dinamis."""
    gas_url = _get_live_env("GOOGLE_APPS_SCRIPT_URL")
    if not gas_url:
        raise HTTPException(
            status_code=400,
            detail="GOOGLE_APPS_SCRIPT_URL belum dikonfigurasi di file .env backend.",
        )

    try:
        if hasattr(payload, "model_dump"):
            payload_data = payload.model_dump()
        else:
            payload_data = payload.dict()

        response = requests.post(
            gas_url,
            json=payload_data,
            headers={"Content-Type": "application/json"},
            allow_redirects=True,
            timeout=30,
        )

        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Google Apps Script merespons HTTP {response.status_code}",
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal terhubung ke Google Apps Script: {str(e)}",
        )