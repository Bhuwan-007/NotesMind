"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FileText, 
  Library, 
  Layers,
  Feather
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div className="flex h-screen w-full overflow-hidden antialiased selection:bg-[var(--color-indigo)] selection:text-[var(--color-khadi-paper)]">
      {/* Navigation Sidebar */}
      <div className="w-20 md:w-64 bg-[var(--color-indigo)] text-[var(--color-khadi-paper)] woven-texture flex flex-col shrink-0 shadow-lg z-20 transition-all duration-300 no-print">
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Feather size={20} className="text-[var(--color-khadi)]" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-ui font-bold text-sm tracking-wide text-white">USAR Dean's Office</h1>
              <p className="font-ui text-[10px] tracking-widest uppercase text-white opacity-60">Notesheet AI</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {[
            { icon: FileText, label: "Active Drafts", href: "/dashboard" },
            { icon: Library, label: "Rule Directory", href: "/dashboard/rules" },
            { icon: Layers, label: "Past Precedents", href: "/dashboard/precedents" },
          ].map((item, i) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link 
                key={i}
                href={item.href}
                className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "bg-white/15 text-white shadow-sm" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden md:block font-ui font-semibold text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/10 hidden md:block">
          <div className="bg-white/5 p-3 rounded-xl text-xs font-ui text-white/70">
            <p className="font-semibold mb-1 text-white">System Status</p>
            <p>AI Engine synced with latest GFR & USAR Statutes.</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full bg-[var(--color-khadi)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
