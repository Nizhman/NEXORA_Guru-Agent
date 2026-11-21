"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import {
  Sparkles,
  Presentation,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Layers,
  Wand2,
  Upload,
  FileText,
  Edit3,
  Loader2,
  X,
  Cpu,
} from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export default function PptPromptGeneratorPage() {
  const [inputMode, setInputMode] = useState<"manual" | "upload">("manual");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aiExtractedSummary, setAiExtractedSummary] = useState<string>("");
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");

  const [aiMeta, setAiMeta] = useState<{
    model_used: string;
    api_key_preview: string;
    source: "settings" | "executed";
  } | null>(null);

  const [form, setForm] = useState({
    courseName: "",
    topic: "",
    materials: "",
    slideCount: "",
    audience: "",
    style: "",
  });

  // Ambil konfigurasi aktif dari Settings saat halaman dimuat
  useEffect(() => {
    const fetchActiveConfig = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/google`);
        if (res.ok) {
          const data = await res.json();
          const rawKey = data.GEMINI_API_KEY || "";
          const maskedKey =
            rawKey.length > 10
              ? `${rawKey.slice(0, 6)}...${rawKey.slice(-4)}`
              : rawKey
              ? "***"
              : "Belum Terpasang";

          setAiMeta({
            model_used: data.GEMINI_MODEL || "gemini-2.5-flash",
            api_key_preview: maskedKey,
            source: "settings",
          });
        }
      } catch {
        // Abaikan jika backend belum siap
      }
    };

    fetchActiveConfig();
  }, []);

  // Handler Utama: Bisa berjalan via Input Manual maupun Upload Dokumen AI
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedSlideCount = Math.max(3, parseInt(form.slideCount || "10", 10) || 10);
    const audienceLabel = form.audience.trim() || "Mahasiswa / Peserta Kelas";
    const styleLabel =
      form.style.trim() || "Akademik, terstruktur, visual & mudah dipahami";

    // MODE 1: INPUT MANUAL
    if (inputMode === "manual") {
      setAiExtractedSummary("");
      const promptTemplate = `Bertindaklah sebagai seorang Dosen/Pengajar ahli dan Desainer Presentasi Akademik. 
Buatkan kerangka dan materi slide presentasi (PowerPoint/PPT) yang komprehensif, terstruktur, dan menarik berdasarkan sumber materi/RPS yang saya unggah serta detail berikut:

📌 **IDENTITAS PERKULIAHAN**
- Mata Kuliah: ${form.courseName}
- Topik Bahasan: ${form.topic}
- Target Audiens: ${audienceLabel}
- Jumlah Slide: Sekitar ${parsedSlideCount} slide
- Gaya Bahasa & Visual: ${styleLabel}

📚 **MATERI & BAHAN KAJIAN YANG HARUS DIBAHAS**
${form.materials}

📋 **INSTRUKSI STRUKTUR OUTPUT PER SLIDE**
Untuk setiap slide (dari Slide 1 hingga Slide ${parsedSlideCount}), tuliskan dengan format berikut:
1. **Judul Slide** (singkat, jelas, dan menarik)
2. **Poin-Poin Utama Isi Slide** (gunakan bullet points yang ringkas, padat, tidak berupa paragraf panjang agar mudah dibaca di layar)
3. **Saran Visual / Diagram / Ilustrasi** (jelaskan grafik, tabel, alur arsitektur, atau ikon yang cocok ditampilkan di slide tersebut)
4. **Catatan Pembicara (Speaker Notes)** (narasi penjelasan mendalam yang dapat saya ucapkan saat menjelaskan slide ini di depan kelas)

Pastikan alur materi dimulai dari:
- Slide 1: Judul Topik & Tujuan Pembelajaran (CPMK/Sub-CPMK)
- Slide 2: Apersepsi / Studi Kasus Pengantar
- Slide 3 s.d. ${Math.max(3, parsedSlideCount - 2)}: Pembahasan Inti Bahan Kajian secara bertahap
- 2 Slide Terakhir: Rangkuman / Kesimpulan & Pertanyaan Diskusi / Kuis Singkat untuk Mahasiswa.`;

      setGeneratedPrompt(promptTemplate);
      return;
    }

    // MODE 2: UPLOAD DOKUMEN & ANALISIS AI
    if (!uploadedFile) {
      alert("Silakan unggah dokumen materi atau RPS (PDF/DOCX/TXT) terlebih dahulu.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("course_name", form.courseName);
      formData.append("topic", form.topic);
      formData.append("slide_count", String(parsedSlideCount));
      formData.append("audience", audienceLabel);
      formData.append("style", styleLabel);
      formData.append("file", uploadedFile);

      const res = await fetch(`${API_BASE_URL}/ai/analyze-ppt-material`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Gagal menganalisis dokumen materi.");
      }

      const data = await res.json();
      setAiExtractedSummary(data.extracted_materials || "");
      setGeneratedPrompt(data.prompt || "");

      if (data.model_used || data.api_key_preview) {
        setAiMeta({
          model_used: data.model_used || "-",
          api_key_preview: data.api_key_preview || "-",
          source: "executed",
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menganalisis dokumen dengan AI.";
      alert(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Gagal menyalin prompt ke clipboard.");
    }
  };

  const handleOpenNotebookLM = () => {
    window.open("https://notebooklm.google.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative flex-1 min-h-screen bg-[#09090b] text-slate-100 overflow-hidden font-sans">
      {/* Mesh Glow Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative">
        <Header title="AI PPT Prompt Generator" />

        <div className="p-6 space-y-6 max-w-[1440px] mx-auto">
          {/* BARIS STATUS KONFIGURASI AI */}
          {aiMeta && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#12121a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl text-xs">
              <span className="text-slate-400">
                {aiMeta.source === "executed"
                  ? "✓ Dieksekusi menggunakan konfigurasi aktif:"
                  : "Konfigurasi Settings terdeteksi:"}
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px] px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>Model: {aiMeta.model_used}</span>
                <span className="text-slate-600">|</span>
                <span>API Key: {aiMeta.api_key_preview}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* KOLOM KIRI: FORM KONFIGURASI & PILIHAN MODE MATERI */}
            <div className="lg:col-span-5 bg-[#12121a]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl space-y-5 h-fit">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Konfigurasi Materi PPT</h3>
                  <p className="text-xs text-slate-400">
                    Pilih input manual atau unggah dokumen RPS/Modul untuk dianalisis AI
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nama Mata Kuliah / Pelajaran
                  </label>
                  <input
                    type="text"
                    value={form.courseName}
                    onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                    placeholder="Contoh: Sistem Informasi Kota Cerdas"
                    className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Topik / Judul Presentasi
                  </label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    placeholder="Contoh: Pengenalan Arsitektur REST API & JSON"
                    className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>

                {/* TAB SWITCHER: INPUT MANUAL VS UPLOAD DOKUMEN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Sumber Rincian Materi
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border border-white/10 rounded-xl mb-3">
                    <button
                      type="button"
                      onClick={() => setInputMode("manual")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        inputMode === "manual"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Input Manual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("upload")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        inputMode === "upload"
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Dokumen (AI)</span>
                    </button>
                  </div>

                  {/* KONTEN BERDASARKAN MODE INPUT */}
                  {inputMode === "manual" ? (
                    <textarea
                      rows={5}
                      value={form.materials}
                      onChange={(e) => setForm({ ...form, materials: e.target.value })}
                      placeholder={
                        "- Konsep dasar arsitektur Client-Server dan protokol HTTP\n- Prinsip RESTful API (Stateless, Resource-based URL, HTTP Methods)\n- Struktur format pertukaran data JSON dan perbandingannya dengan XML\n- Studi kasus implementasi API pada layanan publik Smart City"
                      }
                      className="w-full px-3.5 py-2.5 text-xs leading-relaxed bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all resize-y"
                      required
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {!uploadedFile ? (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 hover:border-indigo-500/60 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all text-center">
                          <Upload className="w-7 h-7 text-indigo-400 mb-2" />
                          <span className="text-xs font-semibold text-slate-200">
                            Klik untuk unggah Dokumen RPS / Modul Ajar
                          </span>
                          <span className="text-[11px] text-slate-400 mt-1">
                            Mendukung format .PDF, .DOCX, atau .TXT
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setUploadedFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-semibold text-white truncate">
                                {uploadedFile.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {(uploadedFile.size / 1024).toFixed(1)} KB — Siap dianalisis AI
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUploadedFile(null)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Hapus file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400">
                        AI akan otomatis membaca isi dokumen/tabel RPS Anda, mengekstrak bahan kajian yang relevan dengan topik, dan menyusun prompt PPT.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Target Jumlah Slide
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={40}
                      placeholder="10"
                      value={form.slideCount}
                      onChange={(e) => setForm({ ...form, slideCount: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all [color-scheme:dark]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Target Audiens / Kelas
                    </label>
                    <input
                      type="text"
                      value={form.audience}
                      onChange={(e) => setForm({ ...form, audience: e.target.value })}
                      placeholder="Contoh: Mahasiswa D4 / S1 Semester 5"
                      className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Gaya Penyampaian & Visual
                  </label>
                  <input
                    type="text"
                    value={form.style}
                    onChange={(e) => setForm({ ...form, style: e.target.value })}
                    placeholder="Contoh: Akademik, terstruktur, visual & mudah dipahami"
                    className="w-full px-3.5 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI Sedang Menganalisis Dokumen...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>
                        {inputMode === "upload"
                          ? "Analisis Dokumen & Buat Prompt"
                          : "Generate Prompt PPT"}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* KOLOM KANAN: HASIL ANALISIS AI, PROMPT SIAP SALIN, & TOMBOL NOTEBOOKLM */}
            <div className="lg:col-span-7 bg-[#12121a]/90 backdrop-blur-xl p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col min-h-[600px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm">Hasil Prompt Siap Pakai</h3>
                    <p className="text-[11px] text-slate-400">
                      Salin prompt di bawah lalu tempelkan ke NotebookLM resmi
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi: Salin Prompt & Pindah ke NotebookLM */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {generatedPrompt && (
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border ${
                        copied
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : "bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-slate-200"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Prompt Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Prompt</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenNotebookLM}
                    className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>Buka NotebookLM Resmi</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col space-y-4">
                {/* Jika hasil berasal dari Analisis Dokumen AI, tampilkan ringkasan bahan kajian yang diekstrak */}
                {aiExtractedSummary && (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/25 rounded-xl space-y-1.5">
                    <p className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Hasil Ekstraksi Bahan Kajian dari Dokumen:
                    </p>
                    <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {aiExtractedSummary}
                    </pre>
                  </div>
                )}

                {generatedPrompt ? (
                  <div className="flex-1 flex flex-col space-y-3">
                    <textarea
                      value={generatedPrompt}
                      onChange={(e) => setGeneratedPrompt(e.target.value)}
                      className="w-full flex-1 min-h-[380px] p-4 text-xs font-mono leading-relaxed bg-[#09090b]/90 border border-white/10 rounded-xl text-slate-200 focus:border-indigo-500 outline-none resize-none custom-scrollbar"
                    />
                    <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <p>
                        <strong>Langkah Selanjutnya:</strong> Klik <strong>Salin Prompt</strong>, lalu tekan{" "}
                        <strong>Buka NotebookLM Resmi</strong>. Buat notebook baru, unggah file{" "}
                        <em>RPS / Modul Ajar</em> Anda sebagai sumber di NotebookLM, lalu tempelkan prompt di atas ke kolom chat.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 py-20 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                      <Layers className="w-8 h-8" />
                    </div>
                    <div className="text-center max-w-sm px-4">
                      <p className="text-sm font-semibold text-slate-200">
                        Belum Ada Prompt PPT yang Dibuat
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Pilih mode <strong>Input Manual</strong> atau <strong>Upload Dokumen (AI)</strong> di sebelah kiri untuk mulai menyusun prompt.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}