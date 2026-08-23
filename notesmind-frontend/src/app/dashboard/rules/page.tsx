"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export default function RuleDirectoryPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchResults = async (searchQuery: string) => {
      setLoading(true);
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      try {
        const res = await api.get(`/knowledge/search?query=${encodeURIComponent(searchQuery)}&type=rule`, {
          signal: abortControllerRef.current.signal
        });
        setResults(res.results || []);
      } catch (error: any) {
        if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") {
          console.error("Search failed:", error);
          setResults([]);
        }
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    const timer = setTimeout(() => {
      const q = query.trim() || "GFR procurement rules";
      fetchResults(q);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-khadi)]">
      <div className="h-28 bg-white border-b border-[#e5e1d8] flex flex-col justify-center px-10 shrink-0 shadow-sm z-10 relative">
        <h1 className="font-document text-2xl font-bold text-[#2c3e50] mb-2">Rule Directory</h1>
        <div className="relative w-full max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GFR rules, guidelines, manuals..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-ui focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading && initialLoad ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-[var(--color-indigo)]" size={32} />
            </div>
          ) : results.length > 0 ? (
            results.map((r, i) => (
              <div key={i} className="citation-card relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border border-[#e5e1d8]">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-400"></div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 mb-2">Rule: {r.id}</span>
                <p className="font-ui text-[13px] text-[#2c3e50] leading-relaxed mb-3">"{r.excerpt}"</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e5e1d8]">
                  <span className="font-ui text-xs text-[var(--color-umber-light)] font-semibold">{r.source}</span>
                  <span className="font-ui text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">{(r.score * 100).toFixed(0)}% Match</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 opacity-50">
              <FileText size={48} className="mx-auto mb-4 text-[var(--color-umber-light)]" strokeWidth={1.5}/>
              <p className="font-ui text-sm text-[var(--color-umber-light)]">No rules found for "{query}".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
