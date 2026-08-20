"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../lib/api";
import { Check, AlertCircle, ShieldAlert, ChevronLeft, Info, Trash2, Send } from "lucide-react";
import { useAuth } from "../../../../components/AuthProvider";

export default function CaseViewerPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [chainData, setChainData] = useState<{required_chain: string[], current_stage: number} | null>(null);
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rules");
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ category: "", amount: 0, budget_head: "", draft_text: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cData, chData, mDocs] = await Promise.all([
          api.get(`/cases/${caseId}`),
          api.get(`/cases/${caseId}/approval-chain`),
          api.get(`/cases/${caseId}/missing-docs`)
        ]);
        setCaseData(cData);
        setChainData(chData);
        setMissingDocs(mDocs.missing_documents || []);
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

  return (
    <div className="flex h-full w-full bg-[var(--color-khadi)]">
      
      {/* Main Document Area */}
      <div className="flex-1 flex flex-col relative h-full">
        
        {/* Top actions bar */}
        <div className="h-14 bg-white bg-opacity-50 border-b border-[#e5e1d8] flex items-center justify-between px-6 shrink-0 z-10">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1.5 text-[var(--color-umber-light)] hover:text-[var(--color-indigo)] transition-colors font-ui text-sm font-semibold">
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          
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
        <div className="h-24 bg-[var(--color-khadi-paper)] border-b border-[#e5e1d8] flex items-center justify-center px-10 shrink-0 shadow-sm z-10">
          <div className="w-full max-w-3xl relative flex justify-between items-center">
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
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="bg-[var(--color-khadi-paper)] w-full max-w-[800px] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-12 lg:p-16 border border-white relative h-max min-h-full">
            
            {missingDocs.length > 0 && (
              <div className="absolute top-8 right-8">
                <span className="bg-[var(--color-terracotta-light)] text-[var(--color-terracotta)] border border-[var(--color-terracotta)] border-opacity-20 px-3 py-1.5 rounded-full font-ui text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                  <AlertCircle size={12} /> Compliance Hold
                </span>
              </div>
            )}

            <div className="mb-12 text-center mt-4">
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
              
              <div className="mt-8 border-t border-dashed border-[#e5e1d8] pt-8">
                {isEditing ? (
                  <textarea 
                    value={editForm.draft_text} 
                    onChange={e => setEditForm({...editForm, draft_text: e.target.value})} 
                    className="w-full h-64 p-4 border border-[#e5e1d8] rounded-md bg-white font-doc text-[17px] leading-relaxed resize-y"
                    placeholder="Draft text..."
                  />
                ) : (
                  <div className="whitespace-pre-wrap">
                    {caseData.draft_text || (
                      <span className="italic text-[var(--color-umber-light)]">
                        No draft text generated yet.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {missingDocs.length > 0 && (
                <div className="my-8 p-6 rounded-2xl bg-[var(--color-terracotta-light)] border border-[var(--color-terracotta)] border-opacity-10 relative overflow-hidden">
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
            </div>
          </div>
        </div>
      </div>

      {/* Insight Panel */}
      <div className="w-80 bg-[var(--color-khadi-paper)] border-l border-[#e5e1d8] shadow-[-10px_0_30px_rgba(0,0,0,0.02)] flex flex-col shrink-0 z-20 h-full">
        
        <div className="p-6 pb-4 border-b border-[#e5e1d8]">
          <h2 className="font-ui font-bold text-base text-[var(--color-indigo)] flex items-center gap-2">
            <Info size={18} /> Drafting Insights
          </h2>
          <p className="font-ui text-xs text-[var(--color-umber-light)] mt-1">AI-assisted rule grounding</p>
        </div>

        <div className="flex p-2 bg-[var(--color-khadi)] mx-4 mt-4 rounded-xl border border-[#e5e1d8] shadow-inner">
          {[
            { id: 'rules', label: 'Citations' },
            { id: 'precedents', label: 'Precedents' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 font-ui text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-[var(--color-indigo)] shadow-sm' 
                  : 'text-[var(--color-umber-light)] hover:text-[var(--color-indigo)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {activeTab === 'rules' && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-white rounded-xl p-4 border border-[var(--color-indigo-mute)] shadow-sm hover:shadow-md transition-shadow cursor-default ring-1 ring-[var(--color-indigo)] ring-opacity-20">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-ui text-[10px] font-bold uppercase tracking-widest text-white bg-[var(--color-indigo)] px-2 py-1 rounded-md">Primary Rule</span>
                  <Check size={16} className="text-[var(--color-indigo)]" />
                </div>
                <h3 className="font-doc font-bold text-lg text-[var(--color-indigo)] mb-1">Approval Chain</h3>
                <p className="font-ui text-sm text-[var(--color-umber-light)] leading-relaxed">
                  Based on the requested amount of ₹{caseData.amount.toLocaleString()}, the required routing is:
                  <br/> <strong>{approvalNodes.join(" ➔ ").toUpperCase()}</strong>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'precedents' && (
            <div className="animate-in fade-in duration-300 space-y-4">
               <div className="bg-white rounded-xl p-4 border border-[var(--color-indigo-mute)] shadow-sm cursor-pointer hover:border-[var(--color-indigo)] transition-colors">
                  <p className="font-ui text-xs text-[var(--color-umber-light)] mb-3 leading-relaxed">
                    No exact precedents found for this specific request.
                  </p>
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
    </div>
  );
}
