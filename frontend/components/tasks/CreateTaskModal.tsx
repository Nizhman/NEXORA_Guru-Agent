import { X } from "lucide-react";

export default function CreateTaskModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f111a] border border-slate-800 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-4">Buat Tugas Baru</h3>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Judul Tugas</label>
            <input 
              type="text" 
              placeholder="Contoh: Tugas 1 Pemrograman Python"
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mata Pelajaran</label>
              <input 
                type="text" 
                placeholder="Pemrograman Web"
                className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Kelas</label>
              <select className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500">
                <option>Kelas X - RPL</option>
                <option>Kelas XI - TKJ</option>
                <option>Kelas XII - SI</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tenggat Waktu (Deadline)</label>
            <input 
              type="datetime-local" 
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Link Google Sheets Rekap</label>
            <input 
              type="url" 
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-600/20"
            >
              Simpan Tugas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}