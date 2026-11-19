import { FileText, CheckCircle2, Clock } from "lucide-react";

export default function TaskStats() {
  const stats = [
    { title: "Total Tugas Aktif", value: "8", icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { title: "Perlu Dikoreksi", value: "14", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { title: "Selesai Ditilai", value: "32", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div key={idx} className={`p-4 rounded-xl border ${stat.bg} bg-slate-900/60 backdrop-blur-md flex items-center justify-between`}>
          <div>
            <p className="text-xs text-slate-400 font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
          </div>
          <div className={`p-3 rounded-lg bg-slate-800/80 ${stat.color}`}>
            <stat.icon className="w-6 h-6" />
          </div>
        </div>
      ))}
    </div>
  );
}