"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import {
  Sparkles,
  FileCheck,
  ScanText,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  ExternalLink,
  X,
  Cpu,
} from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export default function GradingAssistantPage() {
  const [mode, setMode] = useState<"evaluate" | "extract">("evaluate");
  const [rubric, setRubric] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [createNewSheet, setCreateNewSheet] = useState(true);
  const [files, setFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<any>(null);

  const [aiMeta, setAiMeta] = useState<{
    model_used: string;
    api_key_preview: string;
    source: "settings" | "executed";
  } | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Harap unggah minimal 1 lembar jawaban siswa.");
      return;
    }

    setLoading(true);
    setResults([]);
    setSpreadsheetInfo(null);

    try {
      const formData = new FormData();
      formData.append("mode", mode);
      formData.append("rubric", rubric);
      formData.append("create_new_sheet", String(createNewSheet));
      formData.append("sheet_url", sheetUrl);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`${API_BASE_URL}/ai/grading/process-batch`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "success") {
        setResults(data.results || []);
        setSpreadsheetInfo(data.spreadsheet || null);

        if (data.model_used || data.api_key_preview) {
          setAiMeta({
            model_used: data.model_used || "-",
            api_key_preview: data.api_key_preview || "-",
            source: "executed",
          });
        }
      } else {
        alert(data.detail || `Gagal memproses penilaian (HTTP ${res.status}).`);
      }
    } catch {
      alert("Terjadi kesalahan koneksi ke backend FastAPI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 min-h-screen bg-[#09090b] text-slate-100 overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-600/10 blur-[120px]" />
      </div>

      <div className="relative">
        <Header title="AI Grading Assistant" />

        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
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

          {/* Opsi Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setMode("evaluate")}
              className={`cursor-pointer relative p-5 rounded-2xl border transition-all ${
                mode === "evaluate"
                  ? "bg-indigo-600/10 border-indigo-500/80 ring-2 ring-indigo-500/30 shadow-lg"
                  : "bg-[#12121a]/80 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${mode === "evaluate" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Opsi 1: AI Koreksi & Analisis Otomatis</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    AI membaca lembar jawaban siswa, mengevaluasi berdasarkan rubrik, memberikan nilai, dan membuat analisis ringkas.
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setMode("extract")}
              className={`cursor-pointer relative p-5 rounded-2xl border transition-all ${
                mode === "extract"
                  ? "bg-purple-600/10 border-purple-500/80 ring-2 ring-purple-500/30 shadow-lg"
                  : "bg-[#12121a]/80 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${mode === "extract" ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-slate-400"}`}>
                  <ScanText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">Opsi 2: Ekstrak Nilai Fisik (OCR Only)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Kertas ujian sudah dinilai manual. AI membaca Nama & Nilai dari berkas untuk direkap ke Google Sheets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Input */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-white/15 via-white/5 to-transparent shadow-2xl">
            <div className="bg-[#12121a]/80 backdrop-blur-xl p-6 rounded-[calc(1rem-1px)] space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {mode === "evaluate" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Kunci Jawaban & Rubrik Penilaian
                    </label>
                    <textarea
                      value={rubric}
                      onChange={(e) => setRubric(e.target.value)}
                      rows={3}
                      className="w-full p-3 text-xs bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-indigo-500 outline-none leading-relaxed"
                      placeholder="Contoh: Soal 1: Fungsi print() (poin 20)..."
                      required
                    />
                  </div>
                )}

                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Destinasi Google Sheets</span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createNewSheet}
                        onChange={(e) => setCreateNewSheet(e.target.checked)}
                        className="rounded border-white/20 bg-white/5 text-emerald-500"
                      />
                      <span>Buat Sheet Baru Otomatis</span>
                    </label>
                  </div>

                  {!createNewSheet && (
                    <input
                      type="text"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="Masukkan URL / ID Google Sheet yang sudah ada"
                      className="w-full px-3 py-2 text-xs bg-white/[0.04] border border-white/10 rounded-lg text-white outline-none"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Upload Foto / PDF Lembar Jawaban Siswa
                  </label>
                  <div className="relative border-2 border-dashed border-white/15 rounded-2xl p-6 text-center hover:border-indigo-500/50 transition-colors bg-white/[0.01]">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-2 pointer-events-none">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-300">
                        Klik atau seret banyak berkas ke sini
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Mendukung format gambar (JPG/PNG) atau PDF multi-halaman
                      </p>
                    </div>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 text-xs bg-white/[0.05] border border-white/10 rounded-lg flex items-center gap-2 text-slate-300"
                      >
                        <span className="truncate max-w-[180px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || files.length === 0}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Menganalisis Berkas & Sinkronisasi Sheets...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Mulai Proses Batch ({files.length} Berkas)
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Hasil Tabel */}
          {results.length > 0 && (
            <div className="p-6 bg-[#12121a]/90 border border-white/10 rounded-2xl space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Hasil Analisis & Rekap Nilai
                </h3>

                {spreadsheetInfo?.spreadsheet_url && (
                  <a
                    href={spreadsheetInfo.spreadsheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google Sheets Rekap</span>
                  </a>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-white/5 text-slate-200 font-semibold border-b border-white/10">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">Nilai</th>
                      {mode === "evaluate" && <th className="p-3">Analisis / Feedback AI</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {results.map((item, index) => (
                      <tr key={index} className="hover:bg-white/[0.02]">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-semibold text-white">{item.student_name}</td>
                        <td className="p-3 font-bold text-emerald-400">{item.score}</td>
                        {mode === "evaluate" && (
                          <td className="p-3 text-slate-400 leading-relaxed">{item.feedback}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}