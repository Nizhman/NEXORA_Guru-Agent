"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Gunakan URL backend dinamis atau fallback ke localhost:8000
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.location.href = `${apiBaseUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-[#0b0d17] flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0f111a] border border-slate-800 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Selamat Datang di TeachFlow AI</h2>
        <p className="text-xs text-slate-400 mb-6">
          Masuk dengan akun Google untuk terhubung ke Google Classroom
        </p>
        
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-slate-900 border border-slate-700 hover:border-violet-500 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span>Menghubungkan ke Google...</span>
            </>
          ) : (
            <>
              <FcGoogle className="w-5 h-5" />
              <span>Masuk dengan Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}