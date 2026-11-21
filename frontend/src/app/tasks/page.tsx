"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import {
  BookOpen,
  CheckSquare,
  Presentation,
  HelpCircle,
  GraduationCap,
  Settings,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

interface DashboardTask {
  id: string;
  courseId?: string;
  title: string;
  className: string;
  deadline: string;
  submittedCount: number;
  totalStudents: number;
  status: string;
}

interface CourseItem {
  id: string;
  name: string;
  section?: string;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigReady, setIsConfigReady] = useState(false);

  const loadDashboardData = useCallback(async (token: string | null) => {
    setIsLoading(true);
    try {
      // 1. Cek status konfigurasi Google di backend
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings/google`).catch(() => null);
      if (settingsRes && settingsRes.ok) {
        const cfg = await settingsRes.json();
        setIsConfigReady(Boolean(cfg.GOOGLE_CLIENT_ID && cfg.GOOGLE_CLIENT_SECRET));
      }

      // 2. Jika token Google Classroom tersedia, tarik kelas & tugas terbaru
      if (token) {
        const [coursesRes, courseworkRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/classroom/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/classroom/coursework`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (coursesRes.ok) {
          const cData = await coursesRes.json();
          setCourses(cData.courses || []);
        }

        if (courseworkRes.ok) {
          const tData = await courseworkRes.json();
          setTasks(tData.tasks || []);
        }
      }
    } catch (err) {
      console.error("Gagal memuat ringkasan dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("access_token");
      const activeToken = urlToken || localStorage.getItem("google_access_token");

      if (urlToken) {
        localStorage.setItem("google_access_token", urlToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setIsConnected(Boolean(activeToken));
      loadDashboardData(activeToken);
    }
  }, [loadDashboardData]);

  // Hitung metrik statistik ringkas
  const activeTasksCount = tasks.filter((t) => t.status === "Aktif").length;
  const scheduledDraftsCount = tasks.filter((t) => t.status === "Draft Terjadwal").length;
  const totalSubmissions = tasks.reduce((acc, t) => acc + (t.submittedCount || 0), 0);
  const totalExpected = tasks.reduce((acc, t) => acc + (t.totalStudents || 0), 0);
  const submissionRate =
    totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0b0d17] text-slate-100 pb-12">
      <Header title="Dashboard Utama" />

      <main className="px-6 mt-6 max-w-7xl mx-auto space-y-6">
        {/* BANNER SAMBUTAN & STATUS INTEGRASI */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/90 via-[#131526] to-purple-950/80 border border-indigo-500/20 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NEXORA Workspace</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Selamat Datang, Pak Nizar
              </h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Kelola penugasan Google Classroom, susun kerangka materi presentasi dari RPS, buat kuis otomatis, dan evaluasi jawaban mahasiswa dalam satu dasbor terpadu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isConnected ? (
                <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Classroom Terhubung</span>
                </div>
              ) : (
                <Link
                  href="/tasks"
                  className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Hubungkan Google Classroom</span>
                </Link>
              )}

              <button
                onClick={() => loadDashboardData(localStorage.getItem("google_access_token"))}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 KARTU METRIK RINGKASAN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Kelas Mengajar</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{courses.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">Kelas aktif di Google Classroom</p>
          </div>

          <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Tugas Aktif</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{activeTasksCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {scheduledDraftsCount} draft terjadwal menunggu rilis
            </p>
          </div>

          <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Rasio Pengumpulan</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{submissionRate}%</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalSubmissions} dari {totalExpected} pengumpulan tugas
            </p>
          </div>

          <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">Integrasi Google API</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Settings className="w-4 h-4" />
              </div>
            </div>
            <p className="text-lg font-bold text-white">
              {isConfigReady ? "Terkonfigurasi" : "Perlu Setup"}
            </p>
            <Link
              href="/settings"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 mt-1 inline-flex items-center gap-1"
            >
              <span>Kelola API Keys</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* AKSES CEPAT FITUR AI & AUTOMATION */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Akses Cepat Asisten AI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/lesson-plan"
              className="group bg-[#0f111a] hover:bg-[#141724] border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-5 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Presentation className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white">AI PPT Prompt Generator</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Unggah dokumen RPS/modul atau ketik materi untuk menyusun prompt presentasi siap pakai di NotebookLM.
              </p>
            </Link>

            <Link
              href="/quiz"
              className="group bg-[#0f111a] hover:bg-[#141724] border border-slate-800/80 hover:border-purple-500/40 rounded-2xl p-5 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white">AI Quiz Generator</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Buat soal pilihan ganda lengkap dengan kunci jawaban, pembahasan, serta ekspor ke Word, PDF, atau Google Forms.
              </p>
            </Link>

            <Link
              href="/grading"
              className="group bg-[#0f111a] hover:bg-[#141724] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-5 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h4 className="text-sm font-bold text-white">AI Grading Assistant</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Evaluasi jawaban esai mahasiswa secara objektif berdasarkan rubrik penilaian yang Anda tentukan.
              </p>
            </Link>
          </div>
        </div>

        {/* DAFTAR TUGAS TERBARU DARI GOOGLE CLASSROOM */}
        <div className="bg-[#0f111a] border border-slate-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Pantauan Tugas Google Classroom</h3>
              <p className="text-xs text-slate-400">
                Ringkasan status pengumpulan tugas terbaru dari kelas Anda
              </p>
            </div>
            <Link
              href="/tasks"
              className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span>Kelola Semua Tugas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <span className="text-xs">Menyinkronkan data dari Google Classroom...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              {isConnected
                ? "Belum ada tugas ditemukan di Google Classroom."
                : "Hubungkan akun Google Classroom di menu Manajemen Tugas untuk melihat pantauan tugas di sini."}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {tasks.slice(0, 5).map((task) => {
                const percent =
                  task.totalStudents > 0
                    ? Math.round((task.submittedCount / task.totalStudents) * 100)
                    : 0;
                return (
                  <div
                    key={task.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            task.status === "Draft Terjadwal"
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {task.status}
                        </span>
                        <span className="text-xs font-medium text-indigo-400">
                          {task.className}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                    </div>

                    <div className="flex items-center gap-5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{task.deadline}</span>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <p className="font-bold text-white">
                          {task.submittedCount}/{task.totalStudents}
                        </p>
                        <p className="text-[10px] text-slate-400">{percent}% terkumpul</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}