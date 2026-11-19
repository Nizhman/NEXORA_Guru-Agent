"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, Send, FileSpreadsheet, Paperclip, Loader2, Calendar } from "lucide-react";
import { Task } from "@/types/task";

interface Course {
  id: string;
  name: string;
  section?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (newTask: Task) => void; // Callback untuk menambah card baru
}

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [postToClassroom, setPostToClassroom] = useState(true);
  const [description, setDescription] = useState("");
  
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchTeacherCourses = async () => {
        setIsLoadingCourses(true);
        setErrorMessage(null);

        try {
          const token = localStorage.getItem("google_access_token");
          if (!token) throw new Error("Token OAuth tidak ditemukan.");

          const res = await fetch("http://localhost:8000/api/classroom/courses", {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) throw new Error("Gagal mengambil data kelas");

          const data = await res.json();
          if (data.courses && data.courses.length > 0) {
            setCourses(data.courses);
            setSelectedCourseId(data.courses[0].id);
          }
        } catch (error) {
          const mockTeachingCourses: Course[] = [
            { id: "c1", name: "D4 SIKC 48-05 Webpro" },
            { id: "c2", name: "Praktikum Webpro SIKC 49-01" },
          ];
          setCourses(mockTeachingCourses);
          setSelectedCourseId(mockTeachingCourses[0].id);
        } finally {
          setIsLoadingCourses(false);
        }
      };

      fetchTeacherCourses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("google_access_token");
      if (postToClassroom && !token) {
        throw new Error("Token Google tidak ada. Hubungkan akun Google terlebih dahulu.");
      }

      const formData = new FormData();
      formData.append("course_id", selectedCourseId);
      formData.append("title", title);
      formData.append("description", description);
      if (deadline) formData.append("deadline", deadline);
      if (scheduledAt) formData.append("scheduled_at", scheduledAt);
      if (sheetUrl) formData.append("sheet_url", sheetUrl);
      if (attachedFile) formData.append("file", attachedFile);

      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:8000/api/classroom/post-assignment", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Gagal memposting tugas ke Google Classroom");
      }

      const resData = await res.json();

      // Cari nama kelas berdasarkan selectedCourseId
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const formattedDeadline = deadline 
        ? new Date(deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
        : "Tanpa Tenggat";

      // Susun objek Task baru untuk ditampilkan sebagai Card
      const newTask: Task = {
        id: resData.classroom_coursework_id || String(Date.now()),
        courseId: selectedCourseId,
        courseworkId: resData.classroom_coursework_id,
        title: title,
        subject: subject,
        className: selectedCourse ? selectedCourse.name : "Kelas Classroom",
        deadline: formattedDeadline,
        submittedCount: 0,
        totalStudents: 30, // Akan terupdate saat pengecekan siswa
        gradedCount: 0,
        status: scheduledAt ? "Draft Terjadwal" : "Aktif",
        sheetUrl: sheetUrl || undefined,
      };

      // Kirim task baru ke parent (TasksPage)
      onTaskCreated(newTask);

      // Reset form & tutup modal
      setTitle("");
      setSubject("");
      setDescription("");
      setDeadline("");
      setScheduledAt("");
      setAttachedFile(null);
      setSheetUrl("");
      onClose();
    } catch (error: any) {
      setErrorMessage(error.message || "Terjadi kesalahan saat menyimpan tugas.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f111a] border border-slate-800 w-full max-w-xl rounded-2xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Buat Tugas Baru</h3>
            <p className="text-xs text-slate-400">Jadwalkan tugas dan hubungkan langsung ke Google Classroom</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Judul Tugas <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text" 
              placeholder="Contoh: Tugas 1 Pemrograman Python"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Mata Pelajaran / Mata Kuliah <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Pemrograman Web"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Kelas Classroom <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={isLoadingCourses}
                  className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500 transition-all disabled:opacity-50"
                  required
                >
                  {isLoadingCourses ? (
                    <option value="">Memuat kelas...</option>
                  ) : (
                    courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} {course.section ? `(${course.section})` : ""}
                      </option>
                    ))
                  )}
                </select>
                {isLoadingCourses && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-violet-400" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                Waktu Buka / Rilis (Draft)
              </label>
              <input 
                type="datetime-local" 
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500 [color-scheme:dark] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Tenggat Waktu (Deadline) <span className="text-rose-500">*</span>
              </label>
              <input 
                type="datetime-local" 
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500 [color-scheme:dark] transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Upload Berkas / Lampiran Tugas (Opsional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 border border-dashed border-slate-700 hover:border-violet-500 rounded-xl cursor-pointer text-slate-300 hover:text-white transition-all">
                <Paperclip className="w-4 h-4 text-violet-400" />
                <span className="text-xs truncate">
                  {attachedFile ? attachedFile.name : "Pilih File Lampiran (PDF, Docx, Gambar)"}
                </span>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setAttachedFile(e.target.files[0]);
                  }}
                />
              </label>
              {attachedFile && (
                <button type="button" onClick={() => setAttachedFile(null)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Link Google Sheets Rekap (Opsional)
            </label>
            <div className="relative">
              <input 
                type="url" 
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all"
              />
              <FileSpreadsheet className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Deskripsi / Petunjuk Tugas
            </label>
            <textarea 
              placeholder="Tuliskan petunjuk pengerjaan tugas di sini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 h-20 resize-none transition-all"
            />
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="postToClassroom"
                checked={postToClassroom}
                onChange={(e) => setPostToClassroom(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded cursor-pointer"
              />
              <label htmlFor="postToClassroom" className="text-xs text-slate-300 font-medium cursor-pointer">
                Posting langsung ke Google Classroom
              </label>
            </div>
            <Send className="w-4 h-4 text-violet-400" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all">
              Batal
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl shadow-lg shadow-violet-600/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {scheduledAt ? "Simpan Draft Terjadwal" : "Simpan & Posting Tugas"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}