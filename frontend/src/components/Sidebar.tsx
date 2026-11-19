"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Presentation,
  HelpCircle,
  GraduationCap,
  Settings,
  Sparkles,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Manajemen Tugas", href: "/tasks", icon: CheckSquare },
  { name: "AI PPT Prompt", href: "/lesson-plan", icon: Presentation },
  { name: "AI Quiz Generator", href: "/quiz", icon: HelpCircle },
  { name: "AI Grading Assistant", href: "/grading", icon: GraduationCap },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800">
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">NEXORA</h1>
          <p className="text-xs text-slate-400">Asisten Digital Guru</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 p-3 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center font-bold justify-center border border-indigo-500/30">
            N
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Pak Nizar, S.Kom</p>
            <p className="text-xs text-slate-400 truncate">Guru Sistem Informasi</p>
          </div>
        </div>
      </div>
    </aside>
  );
}