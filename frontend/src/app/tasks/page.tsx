"use client";

import { useState, useEffect, useCallback, type ComponentProps } from "react";
import Header from "../../components/Header";
import TaskStats from "@/components/tasks/TaskStats";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskModal from "../../components/tasks/CreateTaskModal";
import UnsubmittedModal from "../../components/tasks/UnsubmittedModal";
import {
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Users,
  Loader2,
  RefreshCw,
  Cpu,
  LogIn,
  AlertCircle,
} from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

type ClassroomTask = Parameters<
  NonNullable<ComponentProps<typeof CreateTaskModal>["onTaskCreated"]>
>[0];

interface CourseOption {
  id: string;
  name: string;
  section?: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<ClassroomTask[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("ALL");

  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUnsubmittedModalOpen, setIsUnsubmittedModalOpen] = useState(false);

  const [selectedTaskInfo, setSelectedTaskInfo] = useState<{
    title: string;
    className: string;
    deadline: string;
  }>({ title: "", className: "", deadline: "" });

  const [unsubmittedStudents, setUnsubmittedStudents] = useState<string[]>([]);
  const [isLoadingUnsubmitted, setIsLoadingUnsubmitted] = useState<string | null>(null);
  const [isConnectedToClassroom, setIsConnectedToClassroom] = useState(false);
  const [hasAuthError, setHasAuthError] = useState(false);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [aiMeta, setAiMeta] = useState<{
    model_used: string;
    api_key_preview: string;
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
          });
        }
      } catch {
        // Abaikan jika backend belum siap
      }
    };

    fetchActiveConfig();
  }, []);

  // Fungsi sinkronisasi data dari Google Classroom
  const syncClassroomData = useCallback(async (token: string) => {
    setIsLoadingTasks(true);
    setHasAuthError(false);
    setSyncErrorMessage(null);

    try {
      const [coursesRes, courseworkRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/classroom/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/classroom/coursework`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Jika token kedaluwarsa atau tidak valid (400 / 401)
      if (
        coursesRes.status === 400 ||
        courseworkRes.status === 400 ||
        coursesRes.status === 401 ||
        courseworkRes.status === 401
      ) {
        localStorage.removeItem("google_access_token");
        setIsConnectedToClassroom(false);
        setHasAuthError(true);
        return;
      }

      if (!coursesRes.ok || !courseworkRes.ok) {
        const failedStatus = !coursesRes.ok ? coursesRes.status : courseworkRes.status;
        setSyncErrorMessage(
          `Gagal memuat data Classroom (HTTP ${failedStatus}). Periksa koneksi atau konfigurasi backend.`
        );
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json().catch(() => ({}));
        setCourses(coursesData.courses || []);
      }

      if (courseworkRes.ok) {
        const courseworkData = await courseworkRes.json().catch(() => ({}));
        setTasks(courseworkData.tasks || []);
      }
    } catch (error) {
      console.error("Gagal sinkronisasi data dari Classroom:", error);
      setSyncErrorMessage(
        `Tidak dapat terhubung ke server (${API_BASE_URL}). Pastikan backend aktif dan CORS mengizinkan origin frontend.`
      );
    } finally {
      setIsLoadingTasks(false);
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

      if (activeToken) {
        setIsConnectedToClassroom(true);
        syncClassroomData(activeToken);
      }
    }
  }, [syncClassroomData]);

  const handleLoginGoogle = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const handleTaskCreated = (newTask: ClassroomTask) => {
    setTasks((prev) => [newTask, ...prev]);
    const token = localStorage.getItem("google_access_token");
    if (token) {
      syncClassroomData(token);
    }
  };

  const handleCheckUnsubmitted = async (task: ClassroomTask) => {
    setSelectedTaskInfo({
      title: task.title,
      className: task.className,
      deadline: task.deadline,
    });

    if (task.courseId && task.courseworkId) {
      setIsLoadingUnsubmitted(task.id);
      try {
        const token = localStorage.getItem("google_access_token");
        if (!token) throw new Error("Token OAuth tidak ditemukan.");

        const res = await fetch(
          `${API_BASE_URL}/api/classroom/unsubmitted/${task.courseId}/${task.courseworkId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setUnsubmittedStudents(data.unsubmitted_students || []);
          setIsUnsubmittedModalOpen(true);
        }
      } catch (error) {
        console.error("Gagal mengambil daftar mahasiswa belum mengumpulkan:", error);
      } finally {
        setIsLoadingUnsubmitted(null);
      }
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesCourse =
      selectedCourseFilter === "ALL" || task.courseId === selectedCourseFilter;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.className.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCourse && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0b0d17] text-slate-100 pb-12 font-sans">
      <Header title="Manajemen Tugas" />

      <main className="px-6 mt-6 max-w-7xl mx-auto space-y-6">
        {/* BARIS STATUS KONFIGURASI AI */}
        {aiMeta && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#12121a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl text-xs">
            <span className="text-slate-400">Konfigurasi AI Aktif (Settings):</span>
            <div className="flex items-center gap-2 font-mono text-[11px] px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Model: {aiMeta.model_used}</span>
              <span className="text-slate-600">|</span>
              <span>API Key: {aiMeta.api_key_preview}</span>
            </div>
          </div>
        )}

        {/* PESAN ERROR SINKRONISASI */}
        {syncErrorMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{syncErrorMessage}</span>
          </div>
        )}

        {/* NOTIFIKASI STATUS KONEKSI CLASSROOM */}
        {hasAuthError ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-amber-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Sesi Google Classroom Anda telah kedaluwarsa atau belum terhubung. Silakan login kembali.
              </span>
            </div>
            <button
              onClick={handleLoginGoogle}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Hubungkan Google Classroom</span>
            </button>
          </div>
        ) : isConnectedToClassroom ? (
          <div className="p-3 px-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Google Classroom Terhubung. Menampilkan tugas dari kelas mengajar Anda.</span>
            </div>
            <button
              onClick={() => {
                const token = localStorage.getItem("google_access_token");
                if (token) syncClassroomData(token);
              }}
              disabled={isLoadingTasks}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-300 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? "animate-spin" : ""}`} />
              <span>Sinkronkan</span>
            </button>
          </div>
        ) : (
          <div className="p-5 bg-[#12121a]/90 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300">
            <div>
              <p className="font-bold text-sm text-white">Hubungkan dengan Google Classroom</p>
              <p className="text-slate-400 mt-0.5">
                Sinkronkan daftar kelas, materi, dan tugas mengajar Anda secara real-time.
              </p>
            </div>
            <button
              onClick={handleLoginGoogle}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-95 text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Login Google Classroom</span>
            </button>
          </div>
        )}

        <TaskStats />

        {/* Action Bar: Pencarian, Filter Kelas, & Tombol Buat Tugas */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Input Pencarian */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul tugas..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>

            {/* Dropdown Filter Berdasarkan Kelas */}
            <div className="relative w-full sm:w-64">
              <BookOpen className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-violet-500 transition-all cursor-pointer appearance-none"
              >
                <option value="ALL">Semua Kelas ({tasks.length})</option>
                {courses.map((course) => {
                  const countInCourse = tasks.filter((t) => t.courseId === course.id).length;
                  return (
                    <option key={course.id} value={course.id}>
                      {course.name} {course.section ? `(${course.section})` : ""} — {countInCourse} Tugas
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Buat Tugas Baru
          </button>
        </div>

        {/* State Loading / Kosong / List Card Tugas */}
        {isLoadingTasks ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
            <p className="text-sm">Memuat daftar kelas & tugas dari Google Classroom...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-[#0f111a] border border-slate-800/80 rounded-2xl">
            <p className="text-sm text-slate-400">
              {isConnectedToClassroom
                ? "Tidak ada tugas ditemukan untuk kelas atau pencarian ini."
                : "Hubungkan Google Classroom terlebih dahulu untuk memuat daftar tugas."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col bg-[#0f111a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg"
              >
                <div className="flex-1">
                  <TaskCard task={task} />
                </div>

                <div className="px-5 py-3 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleCheckUnsubmitted(task)}
                    disabled={isLoadingUnsubmitted === task.id}
                    className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoadingUnsubmitted === task.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                    <span>Lihat Belum Mengumpulkan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <UnsubmittedModal
        isOpen={isUnsubmittedModalOpen}
        onClose={() => setIsUnsubmittedModalOpen(false)}
        taskTitle={selectedTaskInfo.title}
        className={selectedTaskInfo.className}
        deadline={selectedTaskInfo.deadline}
        unsubmittedStudents={unsubmittedStudents}
      />
    </div>
  );
}