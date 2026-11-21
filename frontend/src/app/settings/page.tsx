"use client";

import { useState, useEffect } from "react";
import Header from "../../components/Header";
import {
  Save,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  FolderKanban,
  Link2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface GoogleConfig {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
  GOOGLE_APPS_SCRIPT_URL: string;
  GOOGLE_SERVICE_ACCOUNT_FILE: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  GOOGLE_SHEET_TEMPLATE_ID: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const DEFAULT_CONFIG: GoogleConfig = {
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "gemini-3.5-flash",
  GOOGLE_APPS_SCRIPT_URL: "",
  GOOGLE_SERVICE_ACCOUNT_FILE: "credentials/google_service_account.json",
  GOOGLE_DRIVE_FOLDER_ID: "",
  GOOGLE_SHEET_TEMPLATE_ID: "",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  GOOGLE_REDIRECT_URI: `${API_BASE_URL}/api/auth/google/callback`,
};

const AVAILABLE_MODELS = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash (Cepat & Handal - Rekomendasi)" },
  { value: "gemini-3.6-flash", label: "Gemini 3.6 Flash (Performa Tinggi & Terbaru)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Analisis Mendalam & Kompleks)" },
  { value: "gemini-flash-latest", label: "Gemini Flash Latest" },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<GoogleConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/google`);
        if (res.ok) {
          const data = await res.json();
          setConfig((prev) => ({
            ...prev,
            ...data,
            GOOGLE_REDIRECT_URI:
              data.GOOGLE_REDIRECT_URI || `${API_BASE_URL}/api/auth/google/callback`,
          }));
          if (
            data.GEMINI_MODEL &&
            !AVAILABLE_MODELS.some((m) => m.value === data.GEMINI_MODEL)
          ) {
            setCustomModelMode(true);
          }
        }
      } catch {
        setErrorMessage("Gagal memuat konfigurasi dari server backend.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (key: keyof GoogleConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    if (saveSuccess) setSaveSuccess(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/google`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || "Gagal menyimpan pengaturan.");
      }

      setSaveSuccess(data.message || "Pengaturan berhasil disimpan!");
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d17] text-slate-100 pb-12">
      <Header title="Pengaturan Integrasi API & Google" />

      <main className="px-6 mt-6 max-w-4xl mx-auto space-y-6">
        {/* Banner Informasi Keamanan */}
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3 text-xs text-indigo-300">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white mb-0.5">Konfigurasi Environment Aplikasi</p>
            <p className="text-slate-400 leading-relaxed">
              Perubahan yang disimpan di halaman ini akan memperbarui konfigurasi runtime backend untuk Gemini AI, Google OAuth, Google Classroom, Google Drive, Google Sheets, dan Apps Script. Untuk penyimpanan permanen saat server restart, pastikan nilai utama juga terpasang di Hugging Face Space Secrets.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Memuat konfigurasi sistem...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* GRUP 0: GEMINI AI API KEY & MODEL */}
            <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Konfigurasi Gemini AI</h3>
                  <p className="text-[11px] text-slate-400">
                    Kunci API dan pilihan model AI utama untuk fitur RPP, Quiz Generator, dan AI Grading
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GEMINI_API_KEY
                  </label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={config.GEMINI_API_KEY}
                      onChange={(e) => handleChange("GEMINI_API_KEY", e.target.value)}
                      placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-fuchsia-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showGeminiKey ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      GEMINI_MODEL (Model Utama)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomModelMode(!customModelMode)}
                      className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 underline"
                    >
                      {customModelMode ? "Pilih dari daftar standar" : "Input nama model manual"}
                    </button>
                  </div>

                  {customModelMode ? (
                    <input
                      type="text"
                      value={config.GEMINI_MODEL}
                      onChange={(e) => handleChange("GEMINI_MODEL", e.target.value)}
                      placeholder="Contoh: gemini-3.5-flash"
                      className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-fuchsia-500 outline-none transition-all"
                    />
                  ) : (
                    <select
                      value={config.GEMINI_MODEL}
                      onChange={(e) => handleChange("GEMINI_MODEL", e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-fuchsia-500 outline-none transition-all"
                    >
                      {AVAILABLE_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* GRUP 1: GOOGLE OAUTH 2.0 */}
            <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
                <KeyRound className="w-5 h-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Kredensial Google OAuth 2.0</h3>
                  <p className="text-[11px] text-slate-400">
                    Digunakan untuk login akun pengajar dan sinkronisasi Google Classroom
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GOOGLE_CLIENT_ID
                  </label>
                  <input
                    type="text"
                    value={config.GOOGLE_CLIENT_ID}
                    onChange={(e) => handleChange("GOOGLE_CLIENT_ID", e.target.value)}
                    placeholder="562642837637-xxxx.apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GOOGLE_CLIENT_SECRET
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={config.GOOGLE_CLIENT_SECRET}
                      onChange={(e) => handleChange("GOOGLE_CLIENT_SECRET", e.target.value)}
                      placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title={showSecret ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GOOGLE_REDIRECT_URI
                  </label>
                  <input
                    type="text"
                    value={config.GOOGLE_REDIRECT_URI}
                    onChange={(e) => handleChange("GOOGLE_REDIRECT_URI", e.target.value)}
                    placeholder="https://nizarngoiewg-nexora-guru-agent-api.hf.space/api/auth/google/callback"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* GRUP 2: GOOGLE DRIVE, SHEETS & SERVICE ACCOUNT */}
            <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
                <FolderKanban className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Google Drive, Sheets & Service Account</h3>
                  <p className="text-[11px] text-slate-400">
                    ID folder penyimpanan, template rekap nilai, dan file kredensial service account
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GOOGLE_DRIVE_FOLDER_ID
                  </label>
                  <input
                    type="text"
                    value={config.GOOGLE_DRIVE_FOLDER_ID}
                    onChange={(e) => handleChange("GOOGLE_DRIVE_FOLDER_ID", e.target.value)}
                    placeholder="1biQf6qGOYSzvANNPKYkSH71dVal6EMiq"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    GOOGLE_SHEET_TEMPLATE_ID
                  </label>
                  <input
                    type="text"
                    value={config.GOOGLE_SHEET_TEMPLATE_ID}
                    onChange={(e) => handleChange("GOOGLE_SHEET_TEMPLATE_ID", e.target.value)}
                    placeholder="1IS1-nBNKaAY5P8vTg2xmYPugI1I1LB8AMW5-W0vD27g"
                    className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  GOOGLE_SERVICE_ACCOUNT_FILE
                </label>
                <input
                  type="text"
                  value={config.GOOGLE_SERVICE_ACCOUNT_FILE}
                  onChange={(e) => handleChange("GOOGLE_SERVICE_ACCOUNT_FILE", e.target.value)}
                  placeholder="credentials/google_service_account.json"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* GRUP 3: GOOGLE APPS SCRIPT WEBHOOK */}
            <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
                <Link2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Google Apps Script Endpoint</h3>
                  <p className="text-[11px] text-slate-400">
                    URL Web App deployment untuk otomasi Google Forms & Scripts
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  GOOGLE_APPS_SCRIPT_URL
                </label>
                <input
                  type="url"
                  value={config.GOOGLE_APPS_SCRIPT_URL}
                  onChange={(e) => handleChange("GOOGLE_APPS_SCRIPT_URL", e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* TOMBOL SIMPAN */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/25 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Konfigurasi...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}