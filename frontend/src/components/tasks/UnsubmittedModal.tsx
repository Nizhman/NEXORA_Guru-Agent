"use client";

import { useState } from "react";
import { X, Users, Copy, Check, MessageSquare } from "lucide-react";

interface UnsubmittedModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  className?: string;
  deadline?: string;
  unsubmittedStudents: string[];
}

export default function UnsubmittedModal({
  isOpen,
  onClose,
  taskTitle,
  className = "",
  deadline = "",
  unsubmittedStudents,
}: UnsubmittedModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Format pesan rapi siap kirim ke WhatsApp
  const generateWhatsAppMessage = () => {
    const header = `*PENGINGAT PENGUMPULAN TUGAS*\n`;
    const courseInfo = className ? `📚 *Kelas:* ${className}\n` : "";
    const taskInfo = `📝 *Tugas:* ${taskTitle}\n`;
    const deadlineInfo = deadline && deadline !== "Tanpa Tenggat" ? `⏰ *Tenggat:* ${deadline}\n` : "";

    if (unsubmittedStudents.length === 0) {
      return `${header}${courseInfo}${taskInfo}\n✅ Semua mahasiswa sudah mengumpulkan tugas ini. Terima kasih!`;
    }

    const studentList = unsubmittedStudents
      .map((student, index) => `${index + 1}. ${student}`)
      .join("\n");

    return (
      `${header}` +
      `${courseInfo}` +
      `${taskInfo}` +
      `${deadlineInfo}\n` +
      `Berikut daftar mahasiswa yang *belum mengumpulkan* (${unsubmittedStudents.length} orang):\n\n` +
      `${studentList}\n\n` +
      `Mohon segera dikumpulkan melalui Google Classroom sebelum tenggat waktu berakhir. Terima kasih.`
    );
  };

  const whatsappText = generateWhatsAppMessage();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(whatsappText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Gagal menyalin teks:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#0f111a] border border-slate-800 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl max-h-[90vh] flex flex-col">
        {/* Tombol Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Belum Mengumpulkan Tugas</h3>
            <p className="text-xs text-slate-400 truncate max-w-xs">{taskTitle}</p>
          </div>
        </div>

        {/* Preview Format Pesan WhatsApp */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 my-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <MessageSquare className="w-3.5 h-3.5" />
              Preview Format Pesan WhatsApp
            </span>
            <span>{unsubmittedStudents.length} Mahasiswa</span>
          </div>

          <pre className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed select-all">
            {whatsappText}
          </pre>
        </div>

        {/* Footer & Tombol Salin */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
              isCopied
                ? "bg-emerald-600 shadow-emerald-600/25"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25"
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Tersalin! Siap Paste di WA</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Format WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}