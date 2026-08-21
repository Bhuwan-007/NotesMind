"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

/* ──────────────────────────────────────────────────────────
   Toast variants
   ────────────────────────────────────────────────────────── */

type ToastVariant = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

const VARIANT_CONFIG: Record<ToastVariant, { icon: React.ElementType; bg: string; border: string; text: string }> = {
  success: {
    icon: Check,
    bg: "rgba(34, 120, 69, 0.12)",
    border: "rgba(34, 120, 69, 0.3)",
    text: "#1a7a3a",
  },
  error: {
    icon: AlertCircle,
    bg: "var(--color-terracotta-light)",
    border: "rgba(196, 90, 66, 0.3)",
    text: "var(--color-terracotta)",
  },
  info: {
    icon: Info,
    bg: "var(--color-indigo-mute)",
    border: "rgba(42, 53, 86, 0.2)",
    text: "var(--color-indigo)",
  },
};

/* ──────────────────────────────────────────────────────────
   Context
   ────────────────────────────────────────────────────────── */

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — fixed at top-center */}
      <div
        style={{
          position: "fixed",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDone={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/* ──────────────────────────────────────────────────────────
   Individual Toast
   ────────────────────────────────────────────────────────── */

function ToastItem({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const cfg = VARIANT_CONFIG[toast.variant];
  const Icon = cfg.icon;

  useEffect(() => {
    // enter → visible
    const enterTimer = setTimeout(() => setPhase("visible"), 20);
    // visible → exit
    const exitTimer = setTimeout(() => setPhase("exit"), 3000);
    // remove from DOM
    const removeTimer = setTimeout(onDone, 3400);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [onDone]);

  const opacity = phase === "enter" ? 0 : phase === "exit" ? 0 : 1;
  const translateY = phase === "enter" ? -16 : phase === "exit" ? -16 : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 20px",
        borderRadius: 14,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        fontFamily: "'Nunito', sans-serif",
        fontSize: 14,
        fontWeight: 700,
        color: cfg.text,
        pointerEvents: "auto",
        opacity,
        transform: `translateY(${translateY}px)`,
        transition: "opacity 0.35s ease, transform 0.35s ease",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={18} strokeWidth={2.5} />
      {toast.message}
    </div>
  );
}
