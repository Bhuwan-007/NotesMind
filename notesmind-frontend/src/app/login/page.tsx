"use client";

import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { api } from "../../lib/api";
import Image from "next/image";
import { Feather, AlertCircle, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const role = formData.get("role") as string;
    
    // Map role to seed user email for demo
    const emailMap: Record<string, string> = {
      officer: "off@test.com",
      hod: "hod@test.com",
      dean: "dean@test.com",
      registrar: "reg@test.com",
      admin: "admin@test.com"
    };
    
    const loginData = new FormData();
    loginData.append("username", emailMap[role]);
    loginData.append("password", "password123"); 
    
    try {
      const response = await api.postForm("/auth/login", loginData);
      login(response.access_token, role);
    } catch (err: any) {
      setError(err.message || "Failed to login. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--color-khadi)] antialiased selection:bg-[var(--color-indigo)] selection:text-[var(--color-khadi-paper)]">
      {/* Left side - Branding/Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[var(--color-indigo)] overflow-hidden woven-texture">
        <Image
          src="/login_bg.png"
          alt="Abstract Institutional Background"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-20 mix-blend-overlay"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-indigo)] via-transparent to-transparent opacity-90" />
        
        <div className="relative z-10 w-full h-full flex flex-col justify-end p-16 pb-24 text-[var(--color-khadi-paper)]">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8 backdrop-blur-sm border border-white/20">
            <Feather size={32} className="text-[var(--color-khadi)]" />
          </div>
          <h1 className="text-6xl font-doc font-bold tracking-tight mb-6">
            NotesMind
          </h1>
          <p className="text-xl font-ui font-light max-w-md text-white/70 leading-relaxed">
            The next-generation AI-assisted notesheet generation & decision support system.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-md space-y-10 bg-[var(--color-khadi-paper)] p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e5e1d8]">
          
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold font-ui text-[var(--color-indigo)] tracking-tight">
              Welcome back
            </h2>
            <p className="mt-3 text-sm font-ui text-[var(--color-umber-light)]">
              Please sign in to your institutional account to continue.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-[var(--color-terracotta-light)] text-[var(--color-terracotta)] border border-[var(--color-terracotta)] border-opacity-20 px-4 py-3 rounded-xl text-sm flex items-center shadow-sm font-ui font-semibold">
                <AlertCircle size={18} className="mr-3 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="role" className="block text-xs font-bold uppercase tracking-wider text-[var(--color-umber-light)]">
                Select your Role
              </label>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  className="appearance-none block w-full px-4 py-3.5 border border-[#e5e1d8] rounded-xl shadow-sm bg-white text-[var(--color-umber)] font-ui font-semibold text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-indigo)] focus:border-[var(--color-indigo)] transition-all cursor-pointer"
                >
                  <option value="officer">Officer (Initiator)</option>
                  <option value="hod">Head of Department</option>
                  <option value="dean">Dean</option>
                  <option value="registrar">Registrar</option>
                  <option value="admin">System Administrator</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-umber-light)]">
                  <ChevronRight size={18} className="transform rotate-90" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl shadow-md text-sm font-bold font-ui text-white bg-[var(--color-indigo)] hover:bg-[var(--color-indigo-light)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-indigo)] disabled:opacity-50 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : (
                "Sign in to Dashboard"
              )}
            </button>
          </form>
          
          <div className="text-center border-t border-[#e5e1d8] pt-6">
            <p className="text-[11px] font-ui font-semibold text-[var(--color-umber-light)] tracking-wide">
              &copy; {new Date().getFullYear()} Institutional Decision Support.<br/>All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
