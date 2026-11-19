import { Task } from "@/types/task";
import { Clock, Users, FileSpreadsheet, Sparkles } from "lucide-react";
import Link from "next/link";

export default function TaskCard({ task }: { task: Task }) {
  const progressPercent = Math.round((task.gradedCount / task.totalStudents) * 100);

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-violet-500/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between group">
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-violet-400 border border-violet-500/20">
            {task.className}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            task.status === 'Aktif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            task.status === 'Mendekati Deadline' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
            'bg-slate-800 text-slate-400'
          }`}>
            {task.status}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
          {task.title}
        </h3>
        <p className="text-xs text-slate-400 mt-1">{task.subject}</p>

        <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{task.deadline}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{task.submittedCount}/{task.totalStudents} Siswa</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400">Progres Penilaian</span>
            <span className="text-violet-400 font-semibold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
        <Link 
          href={`/grading?taskId=${task.id}`}
          className="flex-1 py-2 px-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-violet-600/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Koreksi AI
        </Link>
        
        {task.sheetUrl && (
          <a 
            href={task.sheetUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition-colors border border-slate-700/50"
            title="Buka Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </a>
        )}
      </div>
    </div>
  );
}