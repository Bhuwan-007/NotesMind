"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { ALL_CATEGORIES, isConfidentialCategory } from "../../../lib/confidentiality";
import { ShieldAlert } from "lucide-react";

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [caseId, setCaseId] = useState<string | null>(null);
  
  // Step 1 State
  const [formData, setFormData] = useState({
    category: "lab equipment purchase",
    amount: "5000",
    purpose: "",
    budget_head: "",
    justification: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  // Step 2 State
  const [missingDocs, setMissingDocs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Step 3 State
  const [draft, setDraft] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const response = await api.post("/cases/", {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setCaseId(response.id);
      
      // Fetch missing docs automatically
      const docsData = await api.get(`/cases/${response.id}/missing-docs`);
      setMissingDocs(docsData.missing_documents);
      
      setStep(2);
    } catch (err) {
      alert("Failed to create case");
    } finally {
      setIsCreating(false);
    }
  };

  const handleMockUpload = async (doc_type: string) => {
    setIsUploading(true);
    try {
      await api.post(`/cases/${caseId}/documents`, {
        filename: `${doc_type.replace(/\s+/g, "_")}.pdf`,
        doc_type
      });
      // Refresh missing docs
      const docsData = await api.get(`/cases/${caseId}/missing-docs`);
      setMissingDocs(docsData.missing_documents);
    } catch (err) {
      alert("Failed to attach document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      const response = await api.post(`/cases/${caseId}/generate-draft`, {});
      setDraft(response);
      setStep(3);
    } catch (err) {
      alert("Failed to generate draft. Ensure you have no missing docs!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/cases/${caseId}/submit-for-approval`, {});
      router.push("/dashboard");
    } catch (err) {
      alert("Failed to submit");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="text-primary hover:text-primary-hover font-medium mb-6 flex items-center"
        >
          ← Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold leading-tight text-ink font-ui mb-8">
          New Notesheet Request
        </h1>

        <div className="bg-bg-surface border border-border sm:rounded-md p-6">
          
          {/* STEP 1: Details */}
          {step === 1 && (
            <form onSubmit={handleCreateCase} className="space-y-6">
              <h2 className="text-xl font-document font-medium text-ink border-b border-border pb-2">
                Step 1: Case Details
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-ink">Category</label>
                  <select
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-bg-primary text-ink"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}{cat.confidential ? " 🔒" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Confidential category badge */}
                  {isConfidentialCategory(formData.category) && (
                    <div className="mt-3" style={{ animation: "modalSlideIn 0.25s ease" }}>
                      <span
                        className="confidential-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                        style={{
                          background: "var(--color-terracotta-light)",
                          color: "var(--color-terracotta)",
                          border: "1px solid rgba(196, 90, 66, 0.25)",
                        }}
                      >
                        <ShieldAlert size={13} /> Requires Dean Authorization
                      </span>
                      <div
                        className="mt-2 p-3 rounded-xl text-xs font-ui leading-relaxed"
                        style={{
                          background: "var(--color-terracotta-light)",
                          color: "var(--color-umber)",
                          borderLeft: "3px solid var(--color-terracotta)",
                        }}
                      >
                        This category is classified as <strong>confidential</strong>. After
                        submission, the Dean must authorize access via OTP before the case
                        can proceed through the approval chain.
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-bg-primary text-ink"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Purpose</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-bg-primary text-ink"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Budget Head</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-bg-primary text-ink"
                  value={formData.budget_head}
                  onChange={(e) => setFormData({ ...formData, budget_head: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink">Justification</label>
                <textarea
                  required
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-bg-primary text-ink"
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={isCreating}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Next: Attach Documents"}
              </button>
            </form>
          )}

          {/* STEP 2: Documents */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-document font-medium text-ink border-b border-border pb-2">
                Step 2: Required Documents
              </h2>
              {missingDocs.length > 0 ? (
                <ul className="divide-y divide-border border border-border rounded-md">
                  {missingDocs.map((doc) => (
                    <li key={doc} className="p-4 flex items-center justify-between bg-bg-primary">
                      <span className="text-sm font-medium text-ink font-mono">{doc}</span>
                      <button
                        onClick={() => handleMockUpload(doc)}
                        disabled={isUploading}
                        className="px-3 py-1 bg-accent-subtle text-accent rounded-md text-sm font-medium hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                      >
                        Mock Upload
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 bg-success text-white rounded-md text-sm font-medium">
                  All required documents attached!
                </div>
              )}
              
              <button
                onClick={handleGenerateDraft}
                disabled={isGenerating || missingDocs.length > 0}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50"
              >
                {isGenerating ? "Consulting AI Agent..." : "Next: Generate AI Notesheet"}
              </button>
            </div>
          )}

          {/* STEP 3: Draft & AI Disagreement */}
          {step === 3 && draft && (
            <div className="space-y-6">
              <h2 className="text-xl font-document font-medium text-ink border-b border-border pb-2">
                Step 3: AI Notesheet & Rules Review
              </h2>
              
              {/* Disagreement UI */}
              {(draft.disagreements.chain_disagreement || draft.disagreements.docs_disagreement) && (
                <div className="p-4 bg-accent-subtle border-l-4 border-accent rounded-r-md">
                  <h3 className="text-sm font-bold text-accent mb-2">⚠ AI Rule Disagreement Detected</h3>
                  <p className="text-sm text-ink mb-2">
                    The AI Agent recommended rules that differ from the strict institutional policies. 
                    The system will enforce the standard institutional rules.
                  </p>
                  <ul className="list-disc pl-5 text-sm text-ink-muted">
                    {draft.disagreements.chain_disagreement && (
                      <li>
                        <strong>Approval Chain:</strong> AI suggested {draft.disagreements.ai_chain.join(" → ")}, 
                        but standard rule requires {draft.disagreements.system_chain.join(" → ")}.
                      </li>
                    )}
                    {draft.disagreements.docs_disagreement && (
                      <li>
                        <strong>Documents:</strong> AI suggested additional non-standard documents.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Generated Notesheet Draft</label>
                <textarea
                  rows={6}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-bg-primary text-ink"
                  defaultValue={draft.draft_text}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-ink mb-2">Citations</h4>
                <div className="space-y-2">
                  {draft.citations.map((c: any, i: number) => (
                    <div key={i} className="p-3 bg-bg-muted rounded-md border border-border">
                      <p className="text-xs font-mono text-ink-muted mb-1">{c.source}</p>
                      <p className="text-sm text-ink italic">"{c.excerpt}"</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-success hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success"
              >
                Submit Request for Approval
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
