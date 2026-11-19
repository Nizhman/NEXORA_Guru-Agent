"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import {
  HelpCircle,
  Sparkles,
  Loader2,
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  BookOpen,
  Cpu,
} from "lucide-react";

export default function QuizGeneratorPage() {
  const [loading, setLoading] = useState(false);
  const [exportingGForm, setExportingGForm] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [aiMeta, setAiMeta] = useState<{
    model_used: string;
    api_key_preview: string;
    source: "settings" | "executed";
  } | null>(null);

  // State Form Parameter
  const [topic, setTopic] = useState("Dasar-dasar Pemrograman Python");
  const [subject, setSubject] = useState("Pemrograman Web & Perangkat Bergerak");
  const [grade, setGrade] = useState("Kelas XI - SMK");
  const [count, setCount] = useState("5");

  // Ambil konfigurasi aktif dari Settings saat halaman dimuat
  useEffect(() => {
    const fetchActiveConfig = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/settings/google");
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
      } catch (err) {
        // Abaikan jika backend belum siap
      }
    };

    fetchActiveConfig();
  }, []);

  // Handler untuk Generate Kuis
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCount = parseInt(count, 10);

    if (isNaN(parsedCount) || parsedCount < 1) {
      alert("Masukkan jumlah soal minimal 1.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          count: parsedCount,
        }),
      });

      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.questions)) {
        // Cek apakah backend mengembalikan error di dalam item array
        if (data.questions.length === 1 && data.questions[0].error) {
          alert(data.questions[0].error);
          return;
        }

        setQuestions(data.questions);

        // Update indikator berdasarkan model & API key yang benar-benar dipakai saat eksekusi
        if (data.model_used || data.api_key_preview) {
          setAiMeta({
            model_used: data.model_used || "-",
            api_key_preview: data.api_key_preview || "-",
            source: "executed",
          });
        }
      } else {
        alert(data.detail || "Gagal menghasilkan kuis dari AI.");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi ke backend FastAPI.");
    } finally {
      setLoading(false);
    }
  };

  // Handler Ekspor ke Word (.docx)
  const handleExportDocx = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/ai/quiz/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject, grade, questions }),
      });

      if (!res.ok) throw new Error("Gagal mengunduh dokumen Word.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kuis_${topic.replace(/\s+/g, "_")}.docx`;
      a.click();
    } catch (err) {
      alert("Gagal mengekspor kuis ke Word.");
    }
  };

  // Handler Ekspor ke PDF
  const handleExportPdf = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/ai/quiz/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject, grade, questions }),
      });

      if (!res.ok) throw new Error("Gagal mengunduh PDF.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Kuis_${topic.replace(/\s+/g, "_")}.pdf`;
      a.click();
    } catch (err) {
      alert("Gagal mengekspor kuis ke PDF.");
    }
  };

  // Handler Ekspor ke Google Forms
  const handleExportGoogleForm = async () => {
    setExportingGForm(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/ai/quiz/export/gform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject, grade, questions }),
      });

      const data = await res.json();
      if (data.status === "success" && data.editUrl) {
        window.open(data.editUrl, "_blank");
      } else {
        alert("Gagal membuat Google Form otomatis.");
      }
    } catch (err) {
      alert("Terjadi kesalahan saat menghubungkan ke Google Forms Service.");
    } finally {
      setExportingGForm(false);
    }
  };

  return (
    <div className="relative flex-1 min-h-screen bg-[#09090b] text-slate-100 overflow-hidden font-sans">
      {/* Mesh Glow Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/3 w-[32rem] h-[32rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative">
        <Header title="AI Quiz Generator" />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
          {/* PANEL KONTROL & FORM INPUT */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent shadow-2xl">
            <div className="bg-[#12121a]/80 backdrop-blur-xl p-6 rounded-[calc(1rem-1px)] space-y-4">
              {/* Baris Status Konfigurasi AI */}
              {aiMeta && (
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
                  <span className="text-slate-400">
                    {aiMeta.source === "executed"
                      ? "Dieksekusi menggunakan konfigurasi aktif:"
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

              <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Topik / Materi */}
                <div className="md:col-span-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Topik & Materi Soal
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    placeholder="Misal: Pemrograman Web dengan React"
                    required
                  />
                </div>

                {/* Mata Pelajaran */}
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    required
                  />
                </div>

                {/* Kelas / Tingkat */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Kelas / Tingkat
                  </label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    required
                  />
                </div>

                {/* Jumlah Soal (Input Angka) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Jumlah Soal
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    placeholder="Contoh: 10"
                    className="w-full px-4 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:bg-white/[0.08] focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all [color-scheme:dark]"
                    required
                  />
                </div>

                {/* Tombol Action */}
                <div className="md:col-span-12 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Buat Kuis AI
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* BARIS TOMBOL EKSPOR (HANYA MUNCUL JIKA KUIS SUDAH DIBUAT) */}
          {questions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#12121a]/90 border border-white/10 rounded-2xl backdrop-blur-xl shadow-xl">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Format Ekspor Kuis ({questions.length} Soal):</span>
                </div>
                {aiMeta && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300">
                    ✓ {aiMeta.model_used} ({aiMeta.api_key_preview})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleExportDocx}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600/80 hover:bg-blue-600 border border-blue-500/30 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <FileText className="w-3.5 h-3.5" /> Word (.docx)
                </button>
                <button
                  onClick={handleExportPdf}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600/80 hover:bg-rose-600 border border-rose-500/30 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> PDF Document
                </button>
                <button
                  onClick={handleExportGoogleForm}
                  disabled={exportingGForm}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/30 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50 active:scale-95"
                >
                  {exportingGForm ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-3.5 h-3.5" />
                  )}
                  Google Forms
                </button>
              </div>
            </div>
          )}

          {/* DAFTAR SOAL KUIS */}
          <div className="space-y-4">
            {loading ? (
              /* Skeleton Loader */
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-6 bg-[#12121a]/60 border border-white/10 rounded-2xl animate-pulse space-y-3">
                    <div className="h-5 bg-white/10 rounded w-1/4" />
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="h-10 bg-white/5 rounded-xl" />
                      <div className="h-10 bg-white/5 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : questions.length > 0 ? (
              /* Kartu Soal */
              questions.map((q, idx) => (
                <div
                  key={idx}
                  className="relative rounded-2xl p-[1px] bg-gradient-to-b from-white/10 via-white/5 to-transparent shadow-lg"
                >
                  <div className="bg-[#12121a]/80 backdrop-blur-xl p-6 rounded-[calc(1rem-1px)] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="font-bold text-sm text-indigo-400">
                        Soal #{q.id || idx + 1}
                      </span>
                      <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Kunci: {q.answer}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-100 text-sm leading-relaxed">
                      {q.question}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options?.map((opt: string, i: number) => (
                        <div
                          key={i}
                          className="p-3 text-xs bg-white/[0.03] border border-white/10 rounded-xl text-slate-300 hover:bg-white/[0.06] transition-colors"
                        >
                          {opt}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 text-xs text-amber-300/90 bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/20">
                      <span className="font-semibold text-amber-400">Pembahasan:</span>{" "}
                      {q.explanation}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              /* Empty State */
              <div className="p-16 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-center space-y-3">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit mx-auto">
                  <HelpCircle className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">Belum Ada Kuis yang Dibuat</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Isi topik materi dan jumlah soal di atas, lalu tekan <span className="text-indigo-400 font-medium">Buat Kuis AI</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}