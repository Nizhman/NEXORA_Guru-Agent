"use client";

import { Bell, Search } from "lucide-react";

export default function Header({ title }: { title: string }) {
  const handleConnectClassroom = () => {
    // Mengarahkan ke endpoint OAuth Google di FastAPI backend
    window.location.href = "http://localhost:8000/api/auth/google";
  };

  return (
    <header className="h-16 bg-[#0b0d17]/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-10 transition-colors">
      {/* Title */}
      <h2 className="text-xl font-bold text-white tracking-tight">
        {title}
      </h2>

      {/* Search & Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Search Bar */}
        <div className="relative w-48 md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fitur, tugas, atau kelas..."
            className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
          />
        </div>

        {/* Tombol Hubungkan Google Classroom */}
        <button
          onClick={handleConnectClassroom}
          className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all shadow-sm"
          title="Hubungkan dengan Akun Google Classroom"
        >
          {/* Logo SVG Google */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="hidden sm:inline">Hubungkan Classroom</span>
        </button>

        {/* Notification Button */}
        <button className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
          <Bell className="w-5 h-5" />
          {/* Notification Indicator Dot */}
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full absolute top-2 right-2 ring-2 ring-[#0b0d17]"></span>
        </button>
      </div>
    </header>
  );
}