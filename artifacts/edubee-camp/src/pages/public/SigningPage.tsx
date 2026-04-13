import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import axios from "axios";
import { CheckCircle2, PenLine, AlertTriangle, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API  = BASE.replace(/\/camp$/, "");

interface Signer {
  role: string;
  name: string;
  email: string;
  required: boolean;
}

interface ContractData {
  contractNumber?: string;
  packageGroupName?: string;
  packageName?: string;
  studentName?: string;
  totalAmount?: string | number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

interface SigningRequest {
  id: string;
  status: string;
  signers: Signer[];
  contractData: ContractData;
  expiresAt: string;
}

// ── Signature Canvas ──────────────────────────────────────────────────────────

function SignatureCanvas({
  label,
  onCapture,
}: {
  label: string;
  onCapture: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [signed, setSigned] = useState(false);

  const getPos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e: any) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.strokeStyle = "#1C1917";
    ctx.lineTo(x, y);
    ctx.stroke();
    setSigned(true);
    onCapture(canvasRef.current!.toDataURL("image/png"));
  };

  const stopDraw = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onCapture(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#1C1917]">{label}</span>
        {signed && (
          <button onClick={clear} className="text-xs text-[#A8A29E] hover:text-[#78716C] transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="border-2 border-[#E8E6E2] rounded-xl overflow-hidden bg-white relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full touch-none cursor-crosshair"
          style={{ height: 140 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!signed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[#A8A29E]">Sign here</p>
          </div>
        )}
      </div>
      <div className="border-t border-dashed border-[#D6D3D1] mx-2" />
    </div>
  );
}

// ── LOA Content Preview ───────────────────────────────────────────────────────

function ContractPreview({ data }: { data: ContractData }) {
  const fmt = (v: unknown) => v ? String(v) : "—";
  const fmtDate = (v: unknown) => {
    if (!v) return "—";
    try { return new Date(String(v)).toLocaleDateString("en-AU", { year:"numeric", month:"long", day:"numeric" }); }
    catch { return String(v); }
  };
  const fmtAmt = (v: unknown, cur = "AUD") => {
    if (!v) return "—";
    try {
      const n = parseFloat(String(v));
      return `${cur} ${n.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`;
    } catch { return String(v); }
  };

  return (
    <div className="prose prose-sm max-w-none text-[#1C1917] space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold text-[#1C1917] mb-1">LETTER OF OFFER AND ACCEPTANCE AGREEMENT</h2>
        <p className="text-sm text-[#78716C]">Issue Date: {fmtDate(data.issueDate ?? new Date().toISOString())}</p>
      </div>

      <p className="text-sm text-[#57534E] leading-relaxed">
        We are excited to offer you a place in the <strong>{fmt(data.packageGroupName)}</strong>.
        We are pleased you chose to join this educational and cultural experience.
        To confirm your participation, please review the details and conditions of this offer below.
      </p>

      <section>
        <h3 className="text-sm font-bold text-[#F5821F] uppercase tracking-wide mb-2">Program Overview</h3>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              ["Program Name", data.packageGroupName],
              ["Package",      data.packageName],
              ["Student Name", data.studentName],
              ["Start Date",   fmtDate(data.startDate)],
              ["End Date",     fmtDate(data.endDate)],
            ].map(([label, value]) => (
              <tr key={String(label)} className="border-b border-[#F0EDE9]">
                <td className="py-2 pr-4 text-[#78716C] font-medium w-40">{String(label)}</td>
                <td className="py-2 text-[#1C1917]">{String(value ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#F5821F] uppercase tracking-wide mb-2">Program Fee</h3>
        <div className="bg-[#FFF8F5] border border-[#F5C5A3] rounded-lg p-4">
          <p className="text-lg font-bold text-[#1C1917]">{fmtAmt(data.totalAmount, data.currency ?? "AUD")}</p>
          <p className="text-xs text-[#78716C] mt-1">Package: {fmt(data.packageName)}</p>
          <p className="text-xs text-[#78716C] mt-0.5">Includes accommodation, meals, transportation, and educational activities</p>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#F5821F] uppercase tracking-wide mb-2">Cancellation & Refund Policy</h3>
        <ul className="text-sm text-[#57534E] space-y-1.5 list-disc pl-4">
          <li>Reservation fee is <strong>non-refundable</strong>.</li>
          <li>Remaining balance due within 14 days of reservation payment.</li>
          <li>Cancel <strong>3 months or more</strong> before start: full refund (minus reservation fee).</li>
          <li>Cancel <strong>less than 3 months</strong> before start: no refund.</li>
          <li>No refund for cancellations due to circumstances beyond our control.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-bold text-[#F5821F] uppercase tracking-wide mb-2">Intellectual Property Rights</h3>
        <p className="text-sm text-[#57534E] leading-relaxed">
          By accepting this offer, you agree that the copyright of photos and videos taken during the camp
          belongs to the camp organiser. We reserve the right to post such materials online or offline.
        </p>
      </section>
    </div>
  );
}

// ── Main Signing Page ─────────────────────────────────────────────────────────

export default function SigningPage() {
  const params = useParams<{ token: string }>();
  const token  = params.token;

  const [state, setState] = useState<"loading" | "ready" | "submitting" | "done" | "error">("loading");
  const [request,  setRequest]  = useState<SigningRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!token) { setErrorMsg("Invalid signing link."); setState("error"); return; }
    axios.get(`${API}/api/contract-signing/public/${token}`)
      .then(r => { setRequest(r.data); setState("ready"); })
      .catch(e => {
        const msg = e.response?.data?.message ?? "This signing link is invalid or has expired.";
        setErrorMsg(msg);
        setState("error");
      });
  }, [token]);

  const handleSig = (role: string, dataUrl: string | null) => {
    setSignatures(prev => ({ ...prev, [role]: dataUrl }));
  };

  const handleSubmit = async () => {
    if (!request) return;
    setSubmitError("");

    // Validate required signers
    const required = request.signers.filter(s => s.required);
    for (const s of required) {
      if (!signatures[s.role]) {
        setSubmitError(`Please provide the signature for: ${s.name}`);
        return;
      }
    }
    if (!agreed) { setSubmitError("Please confirm that you agree to the terms and conditions."); return; }

    const sigs = request.signers
      .filter(s => signatures[s.role])
      .map(s => ({
        role:           s.role,
        name:           s.name,
        signatureImage: signatures[s.role]!,
        signedAt:       new Date().toISOString(),
      }));

    setState("submitting");
    try {
      await axios.post(`${API}/api/contract-signing/public/${token}/sign`, { signatures: sigs });
      setState("done");
    } catch (e: any) {
      setSubmitError(e.response?.data?.error ?? "Failed to submit. Please try again.");
      setState("ready");
    }
  };

  // ── Loading ──
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#F5821F] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#78716C]">Loading your agreement…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (state === "error") {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1C1917] mb-2">Link Unavailable</h2>
          <p className="text-[#78716C] text-sm leading-relaxed">{errorMsg}</p>
          <p className="text-xs text-[#A8A29E] mt-4">If you think this is an error, please contact your agent.</p>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (state === "done") {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-2">Agreement Signed!</h2>
          <p className="text-[#78716C] text-sm leading-relaxed">
            Thank you for signing the Letter of Offer and Acceptance Agreement.
            A signed copy will be prepared and you will be contacted shortly to confirm your enrollment.
          </p>
          <p className="text-xs text-[#A8A29E] mt-5">You may now close this window.</p>
        </div>
      </div>
    );
  }

  if (!request) return null;
  const data = request.contractData ?? {};

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Nav bar */}
      <div className="bg-white border-b border-[#E8E6E2] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-[#F5821F]" />
            <span className="font-bold text-[#1C1917] text-sm">Edubee</span>
          </div>
          <span className="text-xs text-[#A8A29E]">Electronic Signature</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-xl font-bold text-[#1C1917]">Review & Sign Agreement</h1>
          <p className="text-sm text-[#78716C] mt-1">
            Please read the agreement carefully before signing.
            {request.expiresAt && (
              <span> This link expires on {new Date(request.expiresAt).toLocaleDateString("en-AU", { year:"numeric",month:"long",day:"numeric" })}.</span>
            )}
          </p>
        </div>

        {/* Contract content */}
        <div className="bg-white rounded-2xl border border-[#E8E6E2] p-6 shadow-sm">
          <ContractPreview data={data} />
        </div>

        {/* Signature pads */}
        <div className="bg-white rounded-2xl border border-[#E8E6E2] p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1C1917] mb-1">Signatures</h2>
            <p className="text-sm text-[#78716C]">Please sign in each box below using your mouse or finger (on touch devices).</p>
          </div>

          {request.signers.map(signer => (
            <div key={signer.role}>
              <SignatureCanvas
                label={`${signer.name} ${signer.required ? "(Required)" : "(Optional)"} — ${signer.role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`}
                onCapture={url => handleSig(signer.role, url)}
              />
            </div>
          ))}

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#F5821F]"
            />
            <span className="text-sm text-[#57534E] leading-relaxed">
              I confirm that I have read and understood the terms and conditions outlined in the
              Letter of Offer and Acceptance Agreement. I accept this offer and agree to the
              payment terms and cancellation policy.
            </span>
          </label>

          {submitError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={state === "submitting" || !agreed}
            className="w-full py-3.5 rounded-xl bg-[#F5821F] hover:bg-[#D96A0A] disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {state === "submitting"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              : <><CheckCircle2 className="w-4 h-4" /> Submit Signed Agreement</>
            }
          </button>
        </div>

        <p className="text-xs text-center text-[#A8A29E]">
          Powered by Edubee · info@edubee.co.au
        </p>
      </div>
    </div>
  );
}
