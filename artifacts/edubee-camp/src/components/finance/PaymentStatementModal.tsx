import { useState } from "react";
import axios from "axios";
import { FileText, X, Download, Send, Loader2, CheckCircle2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ISSUE_REASONS = [
  "Visa Submission",
  "Parent Request",
  "Refund Processing",
  "Student Request",
  "Other",
] as const;

interface Props {
  contractId:   string;
  studentName:  string;
  studentEmail: string | null;
  onClose:      () => void;
  onGenerated:  () => void;
}

export default function PaymentStatementModal({ contractId, studentName, studentEmail, onClose, onGenerated }: Props) {
  const [scope,       setScope]       = useState<"contract" | "student">("contract");
  const [reason,      setReason]      = useState<string>("");
  const [sendEmail,   setSendEmail]   = useState(false);
  const [emailTo,     setEmailTo]     = useState(studentEmail ?? "");
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState<{ id: string; ref: string } | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${BASE}/api/statements/generate`, {
        scope,
        contractId,
        issueReason: reason || undefined,
        sendEmail,
        emailTo: sendEmail ? emailTo : undefined,
      });
      setDone({ id: data.id, ref: data.statementRef });
      onGenerated();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to generate statement. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!done) return;
    window.open(`${BASE}/api/statements/${done.id}/pdf`, "_blank");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E6E2]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:"#FEF0E3" }}>
              <FileText size={16} style={{ color:"#F5821F" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1C1917]">Generate Payment Statement</h2>
              <p className="text-[11px] text-[#A8A29E]">{studentName}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F4F3F1] transition-colors">
            <X size={15} className="text-[#57534E]" />
          </button>
        </div>

        {/* Body */}
        {!done ? (
          <div className="px-6 py-5 space-y-5">

            {/* Scope */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] mb-2 block">
                Scope
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors"
                  style={scope === "contract"
                    ? { borderColor:"#F5821F", background:"#FFFBF5" }
                    : { borderColor:"#E8E6E2", background:"white" }}>
                  <input type="radio" name="scope" value="contract"
                    checked={scope === "contract"}
                    onChange={() => setScope("contract")}
                    className="accent-[#F5821F]" />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">This contract only</p>
                    <p className="text-[11px] text-[#A8A29E]">Payments linked to this contract — most common for visa submission</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors"
                  style={scope === "student"
                    ? { borderColor:"#F5821F", background:"#FFFBF5" }
                    : { borderColor:"#E8E6E2", background:"white" }}>
                  <input type="radio" name="scope" value="student"
                    checked={scope === "student"}
                    onChange={() => setScope("student")}
                    className="accent-[#F5821F]" />
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">All contracts for this student</p>
                    <p className="text-[11px] text-[#A8A29E]">Consolidated history for multi-contract students</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#57534E] mb-2 block">
                Reason for Issuance <span className="text-[#A8A29E] font-normal normal-case">(optional)</span>
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm text-[#1C1917] bg-white focus:outline-none focus:border-[#F5821F]">
                <option value="">— Select reason —</option>
                {ISSUE_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Email delivery */}
            <div className="border border-[#E8E6E2] rounded-xl p-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={e => setSendEmail(e.target.checked)}
                  className="accent-[#F5821F] w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-[#1C1917]">Send automatically to student email</p>
                  <p className="text-[11px] text-[#A8A29E]">PDF will be attached and sent immediately after generation</p>
                </div>
              </label>
              {sendEmail && (
                <input
                  type="email"
                  value={emailTo}
                  onChange={e => setEmailTo(e.target.value)}
                  placeholder="student@email.com"
                  className="mt-3 w-full h-9 px-3 rounded-lg border border-[#E8E6E2] text-sm focus:outline-none focus:border-[#F5821F]"
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-[#DC2626] bg-[#FEF2F2] rounded-lg px-4 py-3">
                {error}
              </div>
            )}
          </div>
        ) : (
          /* Success state */
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background:"#DCFCE7" }}>
              <CheckCircle2 size={28} style={{ color:"#16A34A" }} />
            </div>
            <div>
              <p className="font-bold text-[#1C1917] text-base">{done.ref} generated</p>
              <p className="text-sm text-[#57534E] mt-1">Payment history statement is ready to download.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background:"#F5821F" }}>
                <Download size={14} /> Download PDF
              </button>
              <button onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-[#E8E6E2] text-[#57534E] hover:bg-[#F4F3F1]">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!done && (
          <div className="px-6 py-4 border-t border-[#E8E6E2] flex justify-end gap-2">
            <button onClick={onClose}
              className="h-9 px-4 rounded-lg border border-[#E8E6E2] text-sm text-[#57534E] hover:bg-[#F4F3F1] transition-colors">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5 transition-opacity disabled:opacity-60"
              style={{ background:"#F5821F" }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              {loading ? "Generating…" : "Generate & Download PDF"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
