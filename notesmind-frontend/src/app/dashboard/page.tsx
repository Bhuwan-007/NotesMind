"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { api } from "../../lib/api";
import { Plus, FileText, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { logout, role } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await api.get("/cases/");
        setCases(data);
      } catch (err) {
        console.error("Failed to fetch cases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const handleNewRequest = () => {
    router.push("/dashboard/new");
  };

  const handleCaseClick = (id: string) => {
    router.push(`/dashboard/cases/${id}`);
  };

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col">
      <header className="flex justify-between items-end mb-8 border-b border-[#e5e1d8] pb-6">
        <div>
          <h2 className="font-ui text-sm font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-1">
            Welcome back, {role || "Officer"}
          </h2>
          <h1 className="font-doc text-3xl font-semibold text-[var(--color-indigo)]">
            Active Drafts & Cases
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={logout}
            className="text-sm font-ui font-semibold text-[var(--color-umber-light)] hover:text-[var(--color-umber)]"
          >
            Sign out
          </button>
          <button
            onClick={handleNewRequest}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-ui font-bold shadow-sm text-white bg-[var(--color-indigo)] hover:bg-[var(--color-indigo-light)] transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Request
          </button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Total Cases", value: cases.length, color: "text-[var(--color-indigo)]", bg: "bg-[var(--color-khadi-paper)]" },
          { label: "Drafts Pending", value: cases.filter(c => c.status === "draft").length, color: "text-[var(--color-umber)]", bg: "bg-white" },
          { label: "Under Review", value: cases.filter(c => c.status === "under_review").length, color: "text-blue-700", bg: "bg-blue-50" }
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} border border-[#e5e1d8] rounded-2xl p-6 shadow-sm`}>
            <p className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-2">{stat.label}</p>
            <p className={`font-doc text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <main className="flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-32 text-[var(--color-umber-light)]">
            Loading cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="bg-[var(--color-khadi-paper)] border border-dashed border-[#dcd7cd] rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[var(--color-indigo-mute)] rounded-full flex items-center justify-center mb-4 text-[var(--color-indigo)]">
              <FileText size={24} />
            </div>
            <h3 className="font-doc text-xl font-semibold text-[var(--color-indigo)] mb-2">No Active Cases</h3>
            <p className="font-ui text-sm text-[var(--color-umber-light)] max-w-md">
              You don't have any drafts or submitted cases yet. Start a new request to see it here.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e1d8] bg-white bg-opacity-50">
                  <th className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--color-umber-light)] py-4 px-6">ID</th>
                  <th className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--color-umber-light)] py-4 px-6">Category</th>
                  <th className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--color-umber-light)] py-4 px-6">Status</th>
                  <th className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--color-umber-light)] py-4 px-6">Stage</th>
                  <th className="py-4 px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e1d8]">
                {cases.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => handleCaseClick(c.id)}
                    className="hover:bg-white transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6 font-mono text-sm text-[var(--color-umber)] opacity-70">
                      {c.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6 font-ui text-sm font-semibold text-[var(--color-indigo)]">
                      {c.category}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 inline-flex font-ui text-[11px] font-bold uppercase tracking-wider rounded-md border ${
                          c.status === "approved"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : c.status === "under_review"
                            ? "bg-[var(--color-indigo-mute)] text-[var(--color-indigo)] border-[var(--color-indigo)] border-opacity-20"
                            : c.status === "rejected"
                            ? "bg-[var(--color-terracotta-light)] text-[var(--color-terracotta)] border-[var(--color-terracotta)] border-opacity-20"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-ui text-sm text-[var(--color-umber-light)]">
                      Stage {c.current_approval_stage}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-khadi)] flex items-center justify-center ml-auto group-hover:bg-[var(--color-indigo-mute)] transition-colors text-[var(--color-umber-light)] group-hover:text-[var(--color-indigo)]">
                        <ChevronRight size={16} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
