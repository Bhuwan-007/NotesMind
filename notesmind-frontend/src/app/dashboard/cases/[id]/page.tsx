"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { Check, AlertCircle, ShieldAlert, ChevronLeft, Info, Trash2, Send, Lock, Loader2, Smartphone, Sparkles, FileText, AlertTriangle, FileWarning, Download, Cloud } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";
import { isConfidentialCase, needsOtpVerification } from "../../../../lib/confidentiality";
import OtpVerificationModal from "../../../../components/OtpVerificationModal";
import { useToast } from "../../../../components/Toast";

export default function CaseViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [chainData, setChainData] = useState<any>(null);
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rules");
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ category: "", amount: 0, budget_head: "", draft_text: "" });
  const [generatingDraft, setGeneratingDraft] = useState(false);
  
  // Citations & Rules from generation
  const [precedents, setPrecedents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  // OTP authorization state
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [fetchingDemoOtp, setFetchingDemoOtp] = useState(false);
  const [authOverlayDismissing, setAuthOverlayDismissing] = useState(false);

  const { showToast } = useToast();
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cData, chData, mDocs, aData] = await Promise.all([
          api.get(`/cases/${caseId}`),
          api.get(`/cases/${caseId}/approval-chain`),
          api.get(`/cases/${caseId}/missing-docs`),
          api.get(`/cases/${caseId}/audit`).catch(() => ({ timeline: [] }))
        ]);
        setCaseData(cData);
        setChainData(chData);
        setMissingDocs(mDocs.missing_documents || []);
        setAuditData(aData.timeline || []);
        
        const citations = cData.citations || [];
        setPrecedents(citations.filter((c: any) => c.type === "precedent"));
        setRules(citations.filter((c: any) => c.type === "rule"));
        
        setEditForm({
          category: cData.category,
          amount: cData.amount,
          budget_head: cData.budget_head || "",
          draft_text: cData.draft_text || ""
        });
      } catch (err) {
        console.error(err);
        alert("Failed to load case data");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [caseId, router]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center font-ui text-[var(--color-umber-light)]">Loading document canvas...</div>;
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/cases/${caseId}`);
      router.push("/dashboard");
    } catch (err: any) {
      alert("Failed to delete draft: " + err.message);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await api.put(`/cases/${caseId}`, editForm);
      setCaseData(updated);
      setIsEditing(false);
      
      // refresh chain if amount/category changed
      const chData = await api.get(`/cases/${caseId}/approval-chain`);
      setChainData(chData);
    } catch (err: any) {
      alert("Failed to save changes: " + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!confirm("Submit this note for official review?")) return;
    setSubmitting(true);
    try {
      await api.post(`/cases/${caseId}/submit-for-approval`, {});
      alert("Submitted successfully!");
      router.push("/dashboard");
    } catch (err) {
      alert("Failed to submit");
      setSubmitting(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const res = await api.post(`/cases/${caseId}/generate-draft`, {});
      setCaseData((prev: any) => ({ ...prev, draft_text: res.draft_text }));
      setEditForm((prev: any) => ({ ...prev, draft_text: res.draft_text }));
      setPrecedents(res.precedents || []);
      setRules(res.rules || []);
      if (res.ai_disagreement && chainData) {
        setChainData({ ...chainData, ai_disagreement: true });
      }
      showToast("Draft generated via AI", "success");
    } catch (err: any) {
      showToast("Failed to generate draft: " + err.message, "error");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.post(`/cases/${caseId}/approve`, {});
      alert("Case approved successfully!");
      router.push("/dashboard");
    } catch (err: any) {
      alert("Failed to approve: " + err.message);
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this case?")) return;
    setRejecting(true);
    try {
      await api.post(`/cases/${caseId}/reject`, {});
      alert("Case rejected.");
      router.push("/dashboard");
    } catch (err: any) {
      alert("Failed to reject: " + err.message);
      setRejecting(false);
    }
  };

  const isDraft = caseData.status === "draft";
  const isUnderReview = caseData.status === "under_review";
  const approvalNodes = chainData?.required_chain || [];
  const currentStep = chainData?.current_stage || 0;
  
  const expectedRole = approvalNodes[currentStep];
  const canApprove = isUnderReview && expectedRole === role;

  const showAuthGate = needsOtpVerification(caseData) && !authOverlayDismissing;

  // ── OTP handlers ──────────────────────────────────────

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      await api.post(`/cases/${caseId}/request-access-otp`, {});
      setOtpSent(true);
      showToast("OTP sent to Dean", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleFetchDemoOtp = async () => {
    setFetchingDemoOtp(true);
    try {
      const data = await api.get("/demo/last-otp");
      setDemoOtp(data.otp || data.code || JSON.stringify(data));
    } catch (err: any) {
      setDemoOtp("Error: " + (err.message || "Could not fetch"));
    } finally {
      setFetchingDemoOtp(false);
    }
  };

  const handleOtpVerified = () => {
    setShowOtpModal(false);
    showToast("Access Granted — Dean authorization verified", "success");
    // Optimistically update local state
    setCaseData((prev: any) => ({ ...prev, access_verified: true }));
    // Brief delay before dissolving the overlay
    setTimeout(() => {
      setAuthOverlayDismissing(true);
    }, 800);
  };

  return (
    <div className="flex h-full w-full bg-[var(--color-khadi)]">
      
      {/* Main Document Area */}
      <div className="flex-1 flex flex-col relative h-full">

        {/* ═══ Awaiting Dean Authorization Gate ═══ */}
        {showAuthGate && (
          <div className="auth-overlay absolute inset-0 z-30 flex items-center justify-center no-print">
            <div
              className="w-full max-w-lg mx-auto p-10 text-center"
              style={{ animation: "modalSlideIn 0.4s ease" }}
            >
              {/* Shield icon */}
              <div className="w-20 h-20 rounded-2xl bg-[var(--color-terracotta-light)] flex items-center justify-center mx-auto mb-6" style={{ border: "2px solid rgba(196,90,66,0.2)" }}>
                <Lock size={36} className="text-[var(--color-terracotta)]" />
              </div>

              <h2 className="font-doc text-2xl font-semibold text-[var(--color-indigo)] mb-2">
                Awaiting Dean Authorization
              </h2>
              <p className="font-ui text-sm text-[var(--color-umber-light)] leading-relaxed mb-8 max-w-sm mx-auto">
                This case is classified <strong>confidential</strong>. The Dean must authorize access via OTP before case details can be viewed.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 items-center">
                <button
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-ui font-bold shadow-sm text-white bg-[var(--color-indigo)] hover:bg-[var(--color-indigo-light)] disabled:opacity-50 transition-all"
                >
                  {sendingOtp ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending OTP…</>
                  ) : otpSent ? (
                    <><Check size={16} /> OTP Sent — Send Again</>
                  ) : (
                    <><Send size={16} /> Send OTP to Dean</>
                  )}
                </button>

                {/* Dean can enter OTP directly */}
                {(role === "dean" || otpSent) && (
                  <button
                    onClick={() => setShowOtpModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-ui font-semibold text-[var(--color-indigo)] hover:bg-[var(--color-indigo-mute)] transition-colors"
                  >
                    <ShieldAlert size={16} /> Enter OTP Code
                  </button>
                )}
              </div>

              {/* ── Demo: Dean's Device View ── */}
              {isDemoMode && otpSent && (
                <div className="demo-panel mt-8 text-left">
                  <div className="flex items-center justify-between mb-3">
                    <span className="demo-panel-badge">
                      <Smartphone size={12} /> Demo: Dean&apos;s Device View
                    </span>
                    <button
                      onClick={handleFetchDemoOtp}
                      disabled={fetchingDemoOtp}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-ui font-bold text-[var(--color-umber-light)] hover:bg-[#e5e1d8] transition-colors disabled:opacity-50"
                    >
                      {fetchingDemoOtp ? (
                        <><Loader2 size={12} className="animate-spin" /> Fetching…</>
                      ) : (
                        "Fetch Latest OTP"
                      )}
                    </button>
                  </div>

                  {demoOtp ? (
                    <div className="text-center py-3">
                      <p className="font-ui text-[10px] text-[var(--color-umber-light)] uppercase tracking-widest mb-2">Received OTP</p>
                      <div className="flex justify-center gap-2">
                        {demoOtp.split("").map((ch, i) => (
                          <span
                            key={i}
                            className="w-10 h-12 flex items-center justify-center rounded-lg font-mono text-xl font-bold"
                            style={{
                              background: "white",
                              border: "1px solid #c5bfb4",
                              color: "var(--color-indigo)",
                            }}
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="font-ui text-xs text-[var(--color-umber-light)] italic text-center py-2">
                      Click &ldquo;Fetch Latest OTP&rdquo; to view the code sent to the Dean.
                    </p>
                  )}

                  <p className="font-ui text-[10px] text-[var(--color-umber-light)] italic mt-3 text-center opacity-70">
                    This panel is for demo purposes only and will not appear in production.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="h-14 bg-white bg-opacity-50 border-b border-[#e5e1d8] flex items-center justify-between px-6 shrink-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-[var(--color-umber-light)] hover:text-[var(--color-indigo)] transition-colors font-ui text-sm font-semibold">
              <ChevronLeft size={16} /> Back to Dashboard
            </button>
            <div className="w-px h-4 bg-[#e5e1d8]"></div>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[var(--color-umber-light)] hover:text-[var(--color-indigo)] transition-colors font-ui text-sm font-semibold">
              <Download size={16} /> Download PDF
            </button>
            <button onClick={() => showToast("Save to Drive coming soon!", "success")} className="flex items-center gap-1.5 text-[var(--color-umber-light)] hover:text-[var(--color-indigo)] transition-colors font-ui text-sm font-semibold">
              <Cloud size={16} /> Save to Drive
            </button>
          </div>
          
          {isDraft && (
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm font-ui font-semibold text-[var(--color-umber-light)]">Cancel</button>
                  <button onClick={handleSaveEdit} className="px-4 py-1.5 rounded-lg text-sm font-ui font-bold shadow-sm text-white bg-green-600 hover:bg-green-700 transition-colors">Save Changes</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 rounded-lg text-sm font-ui font-semibold text-[var(--color-indigo)] bg-[var(--color-indigo-mute)] bg-opacity-30 hover:bg-opacity-50 transition-colors">Edit Details</button>
              )}
              
              <button 
                onClick={() => setShowDeleteModal(true)}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-ui font-semibold text-[var(--color-terracotta)] hover:bg-[var(--color-terracotta-light)] transition-colors"
              >
                <Trash2 size={16} /> Delete Draft
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-ui font-bold shadow-sm text-white bg-[var(--color-indigo)] hover:bg-[var(--color-indigo-light)] transition-colors"
              >
                <Send size={16} /> Submit Note
              </button>
            </div>
          )}

          {canApprove && (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleReject}
                disabled={rejecting || approving}
                className="px-4 py-1.5 rounded-lg text-sm font-ui font-semibold text-[var(--color-terracotta)] hover:bg-[var(--color-terracotta-light)] transition-colors"
              >
                {rejecting ? "Rejecting..." : "Reject Note"}
              </button>
              <button 
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-ui font-bold shadow-sm text-white bg-green-700 hover:bg-green-800 transition-colors"
              >
                <Check size={16} /> {approving ? "Approving..." : "Approve Note"}
              </button>
            </div>
          )}
        </div>

        {/* Soft Thread Stepper Header */}
        <div className="h-28 bg-[var(--color-khadi-paper)] border-b border-[#e5e1d8] flex flex-col items-center justify-center px-10 shrink-0 shadow-sm z-10 relative no-print">
          
          {chainData?.ai_disagreement && (
            <div className="absolute top-2 flex items-center justify-center w-full pointer-events-none">
              <div className="ai-disagreement-badge px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 pointer-events-auto">
                <AlertTriangle size={12} strokeWidth={3} /> AI and system rules disagree on required approver — review recommended
              </div>
            </div>
          )}

          <div className="w-full max-w-3xl relative flex justify-between items-center mt-3">
            <div className="thread-stepper-line"></div>
            {approvalNodes.map((node: string, idx: number) => {
              let state = "pending";
              if (idx < currentStep || caseData.status === "approved") state = "completed";
              else if (idx === currentStep && caseData.status === "under_review") state = "active";
              
              return (
                <div key={idx} className="flex flex-col items-center gap-2 relative z-10 bg-[var(--color-khadi-paper)] px-4 py-1">
                  <div className={`thread-node ${state}`}>
                    {state === "completed" ? <Check size={14} strokeWidth={3} /> : idx + 1}
                  </div>
                  <span className={`font-ui text-[11px] font-bold uppercase tracking-wider ${state === "active" ? 'text-[var(--color-indigo)]' : 'text-[var(--color-umber-light)]'}`}>
                    {node}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-[#f0ede6]">
          <div className="a4-document h-max">
            
            {missingDocs.length > 0 && (
              <div className="absolute top-8 right-8">
                <span className="bg-[var(--color-terracotta-light)] text-[var(--color-terracotta)] border border-[var(--color-terracotta)] border-opacity-20 px-3 py-1.5 rounded-full font-ui text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <AlertCircle size={12} /> Compliance Hold
                </span>
              </div>
            )}

            <div className="border-b border-[#e5e1d8] pb-6 mb-8 text-center mt-4">
              <h2 className="font-ui text-sm font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-2">
                University School of Automation & Robotics
              </h2>
              <h1 className="font-doc text-3xl font-semibold text-[var(--color-indigo)]">
                Note for Administrative Approval
              </h1>
            </div>

            <div className="font-doc text-[17px] leading-relaxed text-[var(--color-umber)] space-y-6">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4 font-ui text-sm">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-umber-light)] uppercase tracking-wider mb-1">Category</label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full p-2 border border-[#e5e1d8] rounded-md bg-white">
                      <option value="lab equipment purchase">Lab Equipment Purchase</option>
                      <option value="faculty travel">Faculty Travel</option>
                      <option value="software license">Software License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-umber-light)] uppercase tracking-wider mb-1">Amount (₹)</label>
                    <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: parseInt(e.target.value) || 0})} className="w-full p-2 border border-[#e5e1d8] rounded-md bg-white" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-[var(--color-umber-light)] uppercase tracking-wider mb-1">Budget Head</label>
                    <input type="text" value={editForm.budget_head} onChange={e => setEditForm({...editForm, budget_head: e.target.value})} className="w-full p-2 border border-[#e5e1d8] rounded-md bg-white" />
                  </div>
                </div>
              ) : (
                <p>
                  <strong>Category:</strong> {caseData.category.toUpperCase()} <br/>
                  <strong>Amount:</strong> ₹{caseData.amount.toLocaleString()} <br/>
                  <strong>Budget Head:</strong> {caseData.budget_head || "N/A"}
                </p>
              )}
              
              <div className="mt-8 border-t border-[#e5e1d8] pt-8 draft-text-container relative">
                
                {/* Stage 2.5 Restricted view */}
                <div className={`redacted-overlay ${!showAuthGate ? 'redacted-overlay-hidden' : ''}`}>
                  <Lock size={48} className="text-[var(--color-terracotta)] mb-4 opacity-80" strokeWidth={1.5} />
                  <span className="font-ui text-sm font-bold uppercase tracking-widest text-[var(--color-terracotta)] bg-white px-4 py-2 rounded-full shadow-sm border border-[var(--color-terracotta)] border-opacity-20">
                    Restricted — Awaiting Dean Authorization
                  </span>
                </div>

                <div className={showAuthGate ? 'draft-text-redacted' : ''}>
                  {isEditing ? (
                    <textarea 
                      value={editForm.draft_text} 
                      onChange={e => setEditForm({...editForm, draft_text: e.target.value})} 
                      className="w-full h-96 p-6 border border-[var(--color-indigo-mute)] rounded-lg bg-[#faf9f7] font-doc text-[17px] leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-indigo)] focus:border-transparent transition-all"
                      placeholder="Draft text..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-doc text-[18px] leading-[1.8] text-[#2c3e50] tracking-[0.2px]">
                      {caseData.draft_text ? (
                        caseData.draft_text
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 opacity-70">
                          <FileText size={48} className="text-[#c5bfb4] mb-4" strokeWidth={1} />
                          <p className="font-ui text-sm text-[var(--color-umber-light)] italic mb-6">No draft text generated yet.</p>
                          <button 
                            onClick={handleGenerateDraft}
                            disabled={generatingDraft}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-ui font-bold shadow-sm text-[var(--color-indigo)] bg-white border border-[var(--color-indigo-mute)] hover:border-[var(--color-indigo)] hover:bg-[#f8f9fa] transition-all"
                          >
                            {generatingDraft ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {generatingDraft ? "Generating Draft..." : "Generate Draft via AI"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {missingDocs.length > 0 && (
                <div className="my-8 p-6 rounded-2xl bg-[var(--color-terracotta-light)] border border-[var(--color-terracotta)] border-opacity-10 relative overflow-hidden no-print">
                   <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--color-terracotta)]"></div>
                   <p className="font-ui font-bold text-[13px] text-[var(--color-terracotta)] uppercase tracking-widest mb-2 flex items-center gap-2">
                     <ShieldAlert size={16} /> Pending Annexures
                   </p>
                   <p className="font-doc text-base text-[var(--color-umber)]">
                     The following mandatory documents are missing from this file:
                   </p>
                   <ul className="list-disc ml-6 mt-2 font-doc font-semibold text-[var(--color-terracotta)]">
                      {missingDocs.map((doc, idx) => <li key={idx}>{doc}</li>)}
                   </ul>
                </div>
              )}

              {/* Signature Blocks */}
              <div className="mt-16 pt-8 grid gap-8 w-full signature-row" style={{ gridTemplateColumns: `repeat(${approvalNodes.length || 3}, minmax(0, 1fr))` }}>
                {approvalNodes.map((node: string, idx: number) => (
                  <div key={idx} className="flex flex-col gap-2 signature-block break-inside-avoid">
                    <div className="h-0 border-b border-dashed border-[#c5bfb4] mb-2 w-full"></div>
                    <span className="font-ui text-xs font-bold uppercase tracking-wider text-[var(--color-indigo)]">
                      {node.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="font-ui text-[10px] text-[var(--color-umber-light)]">Date: _________________</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Citations Footer */}
            {(rules.length > 0 || precedents.length > 0) && (
              <div className="mt-16 pt-12">
                <div className="border-t border-[#e5e1d8] pt-4">
                  <h4 className="font-ui text-xs font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-3">References & Citations</h4>
                  <div className="space-y-3">
                    {rules.map((r, i) => (
                      <p key={`r-${i}`} className="font-doc text-[11px] text-[var(--color-umber-light)] leading-relaxed">
                        <span className="font-bold text-[var(--color-indigo)]">Rule {i+1}:</span> {r.excerpt} — <em className="text-[var(--color-umber)]">{r.source}</em>
                      </p>
                    ))}
                    {precedents.map((p, i) => (
                      <p key={`p-${i}`} className="font-doc text-[11px] text-[var(--color-umber-light)] leading-relaxed">
                        <span className="font-bold text-[var(--color-indigo)]">Precedent {i+1}:</span> {p.excerpt} — <em className="text-[var(--color-umber)]">{p.source}</em>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insight Panel */}
      <div className="w-80 bg-[var(--color-khadi-paper)] border-l border-[#e5e1d8] shadow-[-10px_0_30px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 h-full no-print">
        
        <div className="p-6 pb-4 border-b border-[#e5e1d8]">
          <h2 className="font-ui font-bold text-base text-[var(--color-indigo)] flex items-center gap-2">
            <Info size={18} /> Drafting Insights
          </h2>
          <p className="font-ui text-xs text-[var(--color-umber-light)] mt-1">AI-assisted rule grounding</p>
        </div>

        <div className="flex p-2 bg-[var(--color-khadi)] mx-4 mt-4 rounded-xl border border-[#e5e1d8] shadow-inner gap-1">
          {[
            { id: 'precedents', label: 'Precedents' },
            { id: 'rules', label: 'Rules' },
            { id: 'docs', label: 'Docs', alert: missingDocs.length > 0 },
            { id: 'audit', label: 'Audit' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 font-ui text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all relative flex justify-center items-center gap-1 ${
                activeTab === tab.id 
                  ? 'bg-white text-[var(--color-indigo)] shadow-sm border border-[#e5e1d8]' 
                  : 'text-[var(--color-umber-light)] hover:text-[var(--color-indigo)] hover:bg-black hover:bg-opacity-5'
              }`}
            >
              {tab.label}
              {tab.alert && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terracotta)] absolute top-2 right-2"></span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {activeTab === 'rules' && (
            <div className="animate-in fade-in duration-300 space-y-4">
              {rules.length > 0 ? rules.map((r, i) => (
                <div key={i} className="citation-card relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-400"></div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200 mb-2">Rule: {r.id}</span>
                  <p className="font-ui text-[13px] text-[#2c3e50] leading-relaxed mb-3">"{r.excerpt}"</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e5e1d8]">
                    <span className="font-ui text-xs text-[var(--color-umber-light)] font-semibold">{r.source}</span>
                    <span className="font-ui text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">{(r.confidence * 100).toFixed(0)}% Match</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50">
                  <FileText size={32} className="mx-auto mb-2 text-[var(--color-umber-light)]" strokeWidth={1.5}/>
                  <p className="font-ui text-xs text-[var(--color-umber-light)]">No rules cited.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'precedents' && (
            <div className="animate-in fade-in duration-300 space-y-4">
               {precedents.length > 0 ? precedents.map((p, i) => (
                <div key={i} className="citation-card relative overflow-hidden">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-400"></div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-purple-50 text-purple-700 border border-purple-200 mb-2">Precedent: {p.id}</span>
                  <p className="font-ui text-[13px] text-[#2c3e50] leading-relaxed mb-3">"{p.excerpt}"</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#e5e1d8]">
                    <span className="font-ui text-xs text-[var(--color-umber-light)] font-semibold">{p.source}</span>
                    <span className="font-ui text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">{(p.confidence * 100).toFixed(0)}% Match</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50">
                  <FileText size={32} className="mx-auto mb-2 text-[var(--color-umber-light)]" strokeWidth={1.5}/>
                  <p className="font-ui text-xs text-[var(--color-umber-light)]">No precedents cited.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'docs' && (
            <div className="animate-in fade-in duration-300 space-y-4">
               {missingDocs.length > 0 ? missingDocs.map((doc, i) => (
                <div key={i} className="citation-card relative overflow-hidden bg-[var(--color-terracotta-light)] border-[var(--color-terracotta)] border-opacity-30">
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--color-terracotta)]"></div>
                  <div className="flex items-start gap-3">
                    <FileWarning size={18} className="text-[var(--color-terracotta)] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-ui text-[13px] font-bold text-[var(--color-terracotta)] mb-1">Missing Annexure</h4>
                      <p className="font-doc text-sm text-[var(--color-umber)] leading-snug">{doc}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50">
                  <Check size={32} className="mx-auto mb-2 text-green-500" strokeWidth={1.5}/>
                  <p className="font-ui text-xs text-green-600 font-bold">All required documents attached.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="animate-in fade-in duration-300 px-2">
              <div className="mt-4">
                {auditData.map((event, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="ml-2">
                      <p className="font-ui text-[10px] font-bold uppercase tracking-widest text-[var(--color-umber-light)] mb-1">
                        {new Date(event.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      <p className="font-ui text-xs font-semibold text-[var(--color-indigo)]">{event.actor}</p>
                      <p className="font-ui text-[13px] text-[#2c3e50] mt-1">{event.action}</p>
                    </div>
                  </div>
                ))}
                {auditData.length === 0 && (
                  <p className="font-ui text-xs text-[var(--color-umber-light)] text-center py-10 italic">No audit history available.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--color-khadi-paper)] p-8 rounded-2xl shadow-xl w-full max-w-sm border border-[#e5e1d8]">
            <h3 className="font-doc text-2xl font-semibold text-[var(--color-terracotta)] mb-2">Delete Draft?</h3>
            <p className="font-ui text-sm text-[var(--color-umber-light)] mb-6">
              This action cannot be undone. Are you sure you want to discard this draft?
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-ui font-semibold text-[var(--color-umber)] hover:bg-[var(--color-khadi)]"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-ui font-bold shadow-sm text-white bg-[var(--color-terracotta)] hover:bg-red-700"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        caseId={caseId}
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleOtpVerified}
      />
    </div>
  );
}
