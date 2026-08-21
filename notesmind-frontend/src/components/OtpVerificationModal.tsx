"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ShieldCheck, RefreshCw, X, Loader2 } from "lucide-react";
import { api } from "../lib/api";

/* ──────────────────────────────────────────────────────────
   Props
   ────────────────────────────────────────────────────────── */

interface OtpVerificationModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

/* ──────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────── */

export default function OtpVerificationModal({ caseId, isOpen, onClose, onVerified }: OtpVerificationModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      setAttemptsRemaining(null);
      setLocked(false);
      setShowSuccess(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      // Focus the next empty input or the last one
      const nextEmpty = newDigits.findIndex((d) => !d);
      inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
    }
  }, [digits]);

  const code = digits.join("");
  const isComplete = code.length === 6;

  const handleVerify = async () => {
    if (!isComplete || locked) return;
    setVerifying(true);
    setError(null);

    try {
      await api.post(`/cases/${caseId}/verify-access-otp`, { otp: code });
      // Success!
      setShowSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 1500);
    } catch (err: any) {
      const msg = err.message || "Verification failed";
      const lower = msg.toLowerCase();

      // Parse known error states
      if (lower.includes("expired")) {
        setError("Code has expired. Please resend a new OTP.");
      } else if (lower.includes("attempt") && lower.includes("exceeded") || lower.includes("locked") || lower.includes("too many")) {
        setError("Too many failed attempts. Please request a new code.");
        setLocked(true);
      } else {
        setError(msg);
      }

      // Try to extract attempts_remaining from the error
      const remainMatch = msg.match(/(\d+)\s*attempt/i);
      if (remainMatch) {
        setAttemptsRemaining(parseInt(remainMatch[1], 10));
      }

      // Clear digits on error
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setLocked(false);
    setAttemptsRemaining(null);
    try {
      await api.post(`/cases/${caseId}/request-access-otp`, {});
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-[var(--color-khadi-paper)] w-full max-w-md rounded-2xl shadow-xl border border-[#e5e1d8] overflow-hidden"
        style={{ animation: "modalSlideIn 0.3s ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-indigo-mute)] flex items-center justify-center">
              <ShieldCheck size={20} className="text-[var(--color-indigo)]" />
            </div>
            <div>
              <h3 className="font-doc text-xl font-semibold text-[var(--color-indigo)]">
                Dean Authorization
              </h3>
              <p className="font-ui text-xs text-[var(--color-umber-light)]">
                Enter the 6-digit OTP sent to the Dean
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-umber-light)] hover:bg-[var(--color-khadi)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {showSuccess ? (
          <div className="px-8 py-12 text-center">
            <div
              className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
              style={{ animation: "successPop 0.4s ease" }}
            >
              <ShieldCheck size={32} className="text-green-600" />
            </div>
            <h4 className="font-doc text-2xl font-semibold text-green-700 mb-1">
              Access Granted
            </h4>
            <p className="font-ui text-sm text-[var(--color-umber-light)]">
              Dean authorization verified successfully.
            </p>
          </div>
        ) : (
          <>
            {/* OTP input */}
            <div className="px-8 py-6">
              <div className="flex justify-center gap-3" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={locked || verifying}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="otp-digit-input"
                    style={{
                      width: 52,
                      height: 60,
                      textAlign: "center",
                      fontSize: 24,
                      fontWeight: 700,
                      fontFamily: "'Nunito', sans-serif",
                      borderRadius: 12,
                      border: error
                        ? "2px solid var(--color-terracotta)"
                        : digit
                        ? "2px solid var(--color-indigo)"
                        : "2px solid #e5e1d8",
                      background: locked ? "#f5f5f5" : "white",
                      color: "var(--color-indigo)",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      caretColor: "var(--color-indigo)",
                    }}
                    onFocus={(e) => {
                      if (!error) {
                        e.target.style.borderColor = "var(--color-indigo)";
                        e.target.style.boxShadow = "0 0 0 3px var(--color-indigo-mute)";
                      }
                    }}
                    onBlur={(e) => {
                      if (!error) {
                        e.target.style.borderColor = digit ? "var(--color-indigo)" : "#e5e1d8";
                        e.target.style.boxShadow = "none";
                      }
                    }}
                  />
                ))}
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 rounded-xl bg-[var(--color-terracotta-light)] border border-[var(--color-terracotta)] border-opacity-20">
                  <p className="font-ui text-sm font-semibold text-[var(--color-terracotta)] text-center">
                    {error}
                  </p>
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <p className="font-ui text-xs text-[var(--color-umber-light)] text-center mt-1">
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-8 pb-8 flex flex-col gap-3">
              <button
                onClick={handleVerify}
                disabled={!isComplete || verifying || locked}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-ui font-bold shadow-sm text-white bg-[var(--color-indigo)] hover:bg-[var(--color-indigo-light)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {verifying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Verify Code
                  </>
                )}
              </button>

              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-ui font-semibold text-[var(--color-indigo)] hover:bg-[var(--color-indigo-mute)] transition-colors disabled:opacity-40"
              >
                {resending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} /> Resend OTP
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
