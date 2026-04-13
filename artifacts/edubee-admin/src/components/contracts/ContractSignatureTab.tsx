import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  PenLine, Send, CheckCircle2, Clock, XCircle, Download,
  Plus, Trash2, AlertTriangle, Mail,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Signer {
  role: string;
  name: string;
  email: string;
  required: boolean;
}

interface SigningRequest {
  id: string;
  status: string;
  signers: Signer[];
  signatures: Array<{ role: string; name: string; signedAt: string }>;
  expiresAt: string;
  createdAt: string;
  pdfPath?: string;
  contractData?: Record<string, unknown>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "Pending Signature", color: "text-amber-600 bg-amber-50 border-amber-200",   icon: Clock },
  signed:    { label: "Fully Signed",      color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  expired:   { label: "Expired",           color: "text-red-600 bg-red-50 border-red-200",          icon: XCircle },
  cancelled: { label: "Cancelled",         color: "text-stone-500 bg-stone-100 border-stone-200",   icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${cfg.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-AU", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return v; }
}

async function downloadPdf(id: string) {
  const res = await axios.get(`${BASE}/api/contract-signing/pdf/${id}`, {
    responseType: "blob",
    withCredentials: true,
  });
  const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `LOA_Signed_${id.slice(0, 8)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Send Signing Request Form ─────────────────────────────────────────────────

function SendRequestForm({
  contractId,
  contract,
  onSent,
}: {
  contractId: string;
  contract: Record<string, unknown>;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [signers, setSigners] = useState<Signer[]>([
    { role: "student",  name: (contract.studentName as string) ?? "", email: (contract.clientEmail as string) ?? "", required: false },
    { role: "guardian", name: "", email: "", required: true },
  ]);
  const [expiryDays, setExpiryDays] = useState(14);

  const mutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/contract-signing/${contractId}/request`, {
        signers: signers.filter(s => s.name || s.email),
        expiryDays,
        contractData: contract,
      }, { withCredentials: true }),
    onSuccess: () => {
      toast({ title: "Signature request sent", description: "Signing links have been emailed to the signers." });
      onSent();
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err.response?.data?.error ?? err.message, variant: "destructive" });
    },
  });

  const updateSigner = (i: number, field: keyof Signer, value: string | boolean) => {
    setSigners(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const removeSigner = (i: number) => setSigners(prev => prev.filter((_, idx) => idx !== i));

  const addSigner = () => setSigners(prev => [...prev, { role: `signer_${prev.length + 1}`, name: "", email: "", required: false }]);

  const validSigners = signers.filter(s => s.name.trim() && s.email.trim());

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Configure Signers</h3>
        <p className="text-xs text-muted-foreground">Add the people who need to sign this agreement. Each will receive an email with a signing link.</p>
      </div>

      <div className="space-y-3">
        {signers.map((signer, i) => (
          <div key={i} className="border border-[var(--e-border)] rounded-lg p-4 bg-[#FAFAF9] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#78716C] uppercase tracking-wide">Signer {i + 1}</span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signer.required}
                    onChange={e => updateSigner(i, "required", e.target.checked)}
                    className="rounded"
                  />
                  Required
                </label>
                {signers.length > 1 && (
                  <button onClick={() => removeSigner(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#78716C] mb-1">Role</label>
                <select
                  value={signer.role}
                  onChange={e => updateSigner(i, "role", e.target.value)}
                  className="w-full text-xs border border-[var(--e-border)] rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                >
                  <option value="student">Student</option>
                  <option value="guardian">Parent / Guardian</option>
                  <option value="agent">Agent</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716C] mb-1">Full Name</label>
                <input
                  type="text"
                  value={signer.name}
                  onChange={e => updateSigner(i, "name", e.target.value)}
                  placeholder="Full name"
                  className="w-full text-xs border border-[var(--e-border)] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78716C] mb-1">Email</label>
                <input
                  type="email"
                  value={signer.email}
                  onChange={e => updateSigner(i, "email", e.target.value)}
                  placeholder="email@example.com"
                  className="w-full text-xs border border-[var(--e-border)] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addSigner}
          className="flex items-center gap-1.5 text-xs text-[#F5821F] hover:text-[#D96A0A] font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Another Signer
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-[#78716C]">Link Expires In</label>
        <select
          value={expiryDays}
          onChange={e => setExpiryDays(Number(e.target.value))}
          className="text-xs border border-[var(--e-border)] rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={21}>21 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || validSigners.length === 0}
          className="flex items-center gap-2 bg-[#F5821F] hover:bg-[#D96A0A] text-white"
        >
          <Send className="w-4 h-4" />
          {mutation.isPending ? "Sending…" : "Send Signing Request"}
        </Button>
      </div>
    </div>
  );
}

// ── Signing Request Card ──────────────────────────────────────────────────────

function SigningRequestCard({ req, onRefresh }: { req: SigningRequest; onRefresh: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const campBase = window.location.origin.includes("localhost")
    ? window.location.origin.replace(/:\d+/, ":20009")
    : window.location.origin;
  const signingUrl = `${campBase}/camp/sign/${(req as any).token ?? ""}`;

  const cancelMutation = useMutation({
    mutationFn: () => axios.delete(`${BASE}/api/contract-signing/${req.id}/cancel`, { withCredentials: true }),
    onSuccess: () => { toast({ title: "Request cancelled" }); onRefresh(); },
    onError: () => toast({ title: "Failed to cancel", variant: "destructive" }),
  });

  const sigs: Array<{ role: string; name: string; signedAt: string }> = (req.signatures as any) ?? [];

  return (
    <div className="border border-[var(--e-border)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAF9] border-b border-[var(--e-border)]">
        <div className="flex items-center gap-3">
          <StatusBadge status={req.status} />
          <span className="text-xs text-muted-foreground">Expires: {fmtDate(req.expiresAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {req.status === "signed" && (
            <button
              onClick={() => downloadPdf(req.id)}
              className="flex items-center gap-1.5 text-xs text-[#F5821F] hover:text-[#D96A0A] font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          )}
          {req.status === "pending" && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Signers Status */}
        <div>
          <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-2">Signers</p>
          <div className="space-y-2">
            {((req.signers as any[]) ?? []).map((signer: Signer) => {
              const signed = sigs.find(s => s.role === signer.role);
              return (
                <div key={signer.role} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#F4F3F1]">
                  <div>
                    <span className="text-xs font-medium text-[#1C1917]">{signer.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({signer.role.replace(/_/g, " ")})</span>
                    {signer.required && <span className="ml-2 text-[10px] text-red-500 font-medium">Required</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {signed ? (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Signed {fmtDate(signed.signedAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Signing Link */}
        {req.status === "pending" && (req as any).token && (
          <div>
            <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide mb-1.5">Signing Link</p>
            <div className="flex items-center gap-2 bg-[#F4F3F1] rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground font-mono truncate flex-1">{signingUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(signingUrl); toast({ title: "Link copied" }); }}
                className="text-xs text-[#F5821F] hover:text-[#D96A0A] font-medium shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function ContractSignatureTab({
  contractId,
  contract,
}: {
  contractId: string;
  contract: Record<string, unknown>;
}) {
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: requests = [], isLoading, refetch } = useQuery<SigningRequest[]>({
    queryKey: ["contract-signing", contractId],
    queryFn: () =>
      axios.get(`${BASE}/api/contract-signing/status/${contractId}`, { withCredentials: true }).then(r => r.data),
  });

  const activePending = requests.find(r => r.status === "pending");
  const hasSigned    = requests.some(r => r.status === "signed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PenLine className="w-4 h-4 text-[#F5821F]" />
            Electronic Signature
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send a Letter of Offer and Acceptance Agreement for electronic signing
          </p>
        </div>
        {!showForm && !activePending && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#F5821F] hover:bg-[#D96A0A] text-white text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Request Signature
          </Button>
        )}
      </div>

      {/* Active pending warning */}
      {activePending && !showForm && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium text-amber-700">A signing request is already pending</p>
            <p className="text-xs text-amber-600 mt-0.5">Cancel the existing request before sending a new one, or share the link below.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
          >
            New Request
          </Button>
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <div className="border border-[var(--e-border)] rounded-xl p-5 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">New Signing Request</h3>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <SendRequestForm
            contractId={contractId}
            contract={contract}
            onSent={() => { setShowForm(false); refetch(); }}
          />
        </div>
      )}

      {/* History */}
      {isLoading && (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading signing history…</div>
      )}

      {!isLoading && requests.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <PenLine className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No signing requests yet</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Request Signature" to send an e-signature request to the client.</p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wide">Signing History</p>
          {[...requests].reverse().map(req => (
            <SigningRequestCard key={req.id} req={req} onRefresh={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
