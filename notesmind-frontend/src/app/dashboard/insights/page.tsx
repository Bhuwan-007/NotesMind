"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, IndianRupee, AlertTriangle, BarChart3 } from "lucide-react";

// ── Theme-consistent palette ──────────────────────────
const CHART_COLORS = [
  "#2a3556", // indigo
  "#c45a42", // terracotta
  "#44537a", // indigo-light
  "#6e6155", // umber-light
  "#3d7a5a", // muted green
  "#8b6e4e", // warm brown
  "#5a6e8b", // steel blue
  "#a0522d", // sienna
];

const STATUS_COLORS: Record<string, string> = {
  draft: "#6e6155",
  under_review: "#44537a",
  approved: "#3d5a45",
  rejected: "#8b2e1f",
};

// ── Types ─────────────────────────────────────────────
interface InsightsSummary {
  total_cases: number;
  total_expenditure: number;
  cases_by_category: { category: string; count: number }[];
  cases_by_status: { status: string; count: number }[];
  expenditure_by_category: { category: string; total: number }[];
}

// ── Custom tooltip ────────────────────────────────────
function ChartTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fcfbf9",
        border: "1px solid #e5e1d8",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        fontFamily: "'Nunito', sans-serif",
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 700, color: "#2a3556", marginBottom: 4 }}>
        {label || payload[0]?.name}
      </p>
      <p style={{ color: "#6e6155" }}>
        {isCurrency ? `₹${Number(payload[0].value).toLocaleString("en-IN")}` : payload[0].value}
      </p>
    </div>
  );
}

// ── Pie label renderer ────────────────────────────────
function renderPieLabel({ name, percent }: any) {
  if (percent < 0.05) return null;
  return `${name} (${(percent * 100).toFixed(0)}%)`;
}

// ── Skeleton loader ───────────────────────────────────
function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-[#e5e1d8] bg-[var(--color-khadi-paper)] ${className}`}
      style={{ minHeight: 220 }}
    >
      <div className="p-6 space-y-4">
        <div className="h-4 w-32 rounded bg-[#e6ddc9]" />
        <div className="h-32 rounded-xl bg-[#e6ddc9] opacity-60" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-[var(--color-indigo-mute)] flex items-center justify-center mb-4">
        <BarChart3 size={22} className="text-[var(--color-indigo)] opacity-60" />
      </div>
      <p className="font-ui text-sm text-[var(--color-umber-light)]">
        No {label} data available yet
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────
export default function InsightsPage() {
  const [data, setData] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get("/insights/summary");
      setData(result);
    } catch (err: any) {
      console.error("Failed to fetch insights:", err);
      setError(err.message || "Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Loading skeleton ──────────────────────────────
  if (loading) {
    return (
      <div className="p-8 lg:p-12 h-full flex flex-col">
        <header className="mb-8 border-b border-[#e5e1d8] pb-6">
          <div className="h-4 w-48 rounded bg-[#e6ddc9] animate-pulse mb-2" />
          <div className="h-8 w-72 rounded bg-[#e6ddc9] animate-pulse" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[#e5e1d8] bg-[var(--color-khadi-paper)] p-6">
              <div className="h-3 w-24 rounded bg-[#e6ddc9] mb-3" />
              <div className="h-8 w-20 rounded bg-[#e6ddc9]" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────
  if (error) {
    return (
      <div className="p-8 lg:p-12 h-full flex items-center justify-center">
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[var(--color-terracotta-light)] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-[var(--color-terracotta)]" />
          </div>
          <h3 className="font-doc text-xl font-semibold text-[var(--color-indigo)] mb-2">
            Unable to Load Insights
          </h3>
          <p className="font-ui text-sm text-[var(--color-umber-light)] mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2.5 rounded-xl font-ui font-bold text-sm text-white bg-[var(--color-indigo)] hover:bg-[var(--color-indigo-light)] transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── Prepare chart data ────────────────────────────
  const statusData = data.cases_by_status.map((s) => ({
    name: s.status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: s.count,
    fill: STATUS_COLORS[s.status] || "#6e6155",
  }));

  const categoryData = data.cases_by_category.map((c, i) => ({
    name: c.category,
    value: c.count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const expenditureData = data.expenditure_by_category.map((c, i) => ({
    name: c.category,
    total: c.total,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="p-8 lg:p-12 h-full flex flex-col">
      {/* ── Header ──────────────────────────────────── */}
      <header className="flex justify-between items-end mb-8 border-b border-[#e5e1d8] pb-6">
        <div>
          <h2 className="font-ui text-sm font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-1">
            Analytics
          </h2>
          <h1 className="font-doc text-3xl font-semibold text-[var(--color-indigo)]">
            Aggregate Insights
          </h1>
        </div>
      </header>

      {/* ── Stat cards row ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {/* Total Cases */}
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-indigo-mute)] flex items-center justify-center">
              <TrendingUp size={16} className="text-[var(--color-indigo)]" />
            </div>
            <p className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)]">
              Total Cases
            </p>
          </div>
          <p className="font-doc text-3xl font-semibold text-[var(--color-indigo)]">
            {data.total_cases}
          </p>
        </div>

        {/* Total Expenditure */}
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-terracotta-light)] flex items-center justify-center">
              <IndianRupee size={16} className="text-[var(--color-terracotta)]" />
            </div>
            <p className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)]">
              Total Expenditure
            </p>
          </div>
          <p className="font-doc text-3xl font-semibold text-[var(--color-terracotta)]">
            ₹{data.total_expenditure.toLocaleString("en-IN")}
          </p>
        </div>

        {/* Statuses breakdown — mini counts */}
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <p className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-3">
            Status Breakdown
          </p>
          <div className="space-y-1.5">
            {data.cases_by_status.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-ui text-xs text-[var(--color-umber)]">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ background: STATUS_COLORS[s.status] || "#6e6155" }}
                  />
                  {s.status.replace("_", " ")}
                </span>
                <span className="font-doc text-sm font-semibold text-[var(--color-indigo)]">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Cases by Category — Donut */}
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-4">
            Cases by Category
          </h3>
          {categoryData.length === 0 ? (
            <EmptyState label="category" />
          ) : (
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="#fcfbf9"
                    label={renderPieLabel}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cases by Status — Donut */}
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-6 shadow-sm flex flex-col">
          <h3 className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-4">
            Cases by Status
          </h3>
          {statusData.length === 0 ? (
            <EmptyState label="status" />
          ) : (
            <div className="flex-1 min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="#fcfbf9"
                    label={renderPieLabel}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: "#6e6155" }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expenditure by Category — Bar chart (full width) */}
        <div className="bg-[var(--color-khadi-paper)] border border-[#e5e1d8] rounded-2xl p-6 shadow-sm flex flex-col lg:col-span-2">
          <h3 className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-4">
            Expenditure by Category
          </h3>
          {expenditureData.length === 0 ? (
            <EmptyState label="expenditure" />
          ) : (
            <div className="flex-1 min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenditureData} barSize={40} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e1d8" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, fill: "#6e6155" }}
                    axisLine={{ stroke: "#e5e1d8" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fill: "#6e6155" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip isCurrency />} />
                  <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                    {expenditureData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
