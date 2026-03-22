import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, Trash2, ArrowLeft, FileDown, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MODULE_LABELS: Record<string, string> = {
  study_abroad:  "🎓 Study",
  pickup:        "🚗 Pickup",
  accommodation: "🏠 Stay",
  internship:    "💼 Work",
  settlement:    "🏙️ Settlement",
  guardian:      "👨‍👩‍👧 Guardian",
  camp:          "🏕️ Camp",
};

const MODULE_OPTIONS = Object.keys(MODULE_LABELS);

const TEMPLATES: Record<string, Array<{ productName: string; serviceModuleType: string; qty: number; unitPrice: string; gstRate: string }>> = {
  "Study Abroad Full Package": [
    { productName: "Study Abroad Program",     serviceModuleType: "study_abroad",  qty: 1, unitPrice: "8000", gstRate: "0" },
    { productName: "Airport Pickup",           serviceModuleType: "pickup",        qty: 1, unitPrice: "150",  gstRate: "10" },
    { productName: "Accommodation (4 weeks)",  serviceModuleType: "accommodation", qty: 4, unitPrice: "350",  gstRate: "0" },
    { productName: "Settlement Support",       serviceModuleType: "settlement",    qty: 1, unitPrice: "500",  gstRate: "10" },
  ],
  "Guardian Package": [
    { productName: "Guardian Service",         serviceModuleType: "guardian",      qty: 1, unitPrice: "2500", gstRate: "10" },
    { productName: "Airport Pickup",           serviceModuleType: "pickup",        qty: 1, unitPrice: "150",  gstRate: "10" },
  ],
  "Internship Package": [
    { productName: "Internship Placement",     serviceModuleType: "internship",    qty: 1, unitPrice: "3000", gstRate: "0" },
    { productName: "Settlement Support",       serviceModuleType: "settlement",    qty: 1, unitPrice: "500",  gstRate: "10" },
  ],
  "Camp Basic Package": [
    { productName: "Camp Program",             serviceModuleType: "camp",          qty: 1, unitPrice: "5000", gstRate: "0" },
    { productName: "Airport Pickup",           serviceModuleType: "pickup",        qty: 1, unitPrice: "150",  gstRate: "10" },
    { productName: "Accommodation (2 weeks)",  serviceModuleType: "accommodation", qty: 2, unitPrice: "350",  gstRate: "0" },
  ],
};

interface LineItem {
  id: string;
  productName: string;
  description: string;
  qty: number;
  unitPrice: string;
  gstRate: string;
  serviceModuleType: string;
}

function calcTotal(item: LineItem): number {
  const base = Number(item.qty) * Number(item.unitPrice);
  return base * (1 + Number(item.gstRate) / 100);
}

function newItem(): LineItem {
  return { id: crypto.randomUUID(), productName: "", description: "", qty: 1, unitPrice: "0", gstRate: "0", serviceModuleType: "" };
}

const STATUS_OPTIONS = ["Draft", "Sent", "Accepted", "Declined", "Expired"];

export default function QuoteBuilderPage() {
  const [, params] = useRoute("/admin/crm/quotes/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const quoteId = params?.id && params.id !== "new" ? params.id : null;

  const [accountName, setAccountName]   = useState("");
  const [expiryDate, setExpiryDate]     = useState("");
  const [quoteStatus, setQuoteStatus]   = useState("Draft");
  const [notes, setNotes]               = useState("");
  const [isTemplate, setIsTemplate]     = useState(false);
  const [items, setItems]               = useState<LineItem[]>([newItem()]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [convertModal, setConvertModal] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["crm-quote", quoteId],
    queryFn: () => axios.get(`${BASE}/api/crm/quotes/${quoteId}`).then(r => r.data),
    enabled: !!quoteId,
  });

  useEffect(() => {
    if (!existing) return;
    setAccountName(existing.accountName ?? "");
    setExpiryDate(existing.expiryDate ?? "");
    setQuoteStatus(existing.quoteStatus ?? "Draft");
    setNotes(existing.notes ?? "");
    setIsTemplate(existing.isTemplate ?? false);
    if (existing.products?.length) {
      setItems(existing.products.map((p: any) => ({
        id: p.id ?? crypto.randomUUID(),
        productName:       p.productName ?? "",
        description:       p.description ?? "",
        qty:               p.qty ?? 1,
        unitPrice:         String(p.unitPrice ?? "0"),
        gstRate:           String(p.gstRate ?? "0"),
        serviceModuleType: p.serviceModuleType ?? "",
      })));
    }
  }, [existing]);

  function applyTemplate(name: string) {
    if (!name || !TEMPLATES[name]) return;
    setItems(TEMPLATES[name].map(t => ({ ...t, id: crypto.randomUUID(), description: "" })));
    setSelectedTemplate(name);
  }

  function updateItem<K extends keyof LineItem>(id: string, key: K, val: LineItem[K]) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: val } : it));
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(it => it.id !== id));
  }

  const subtotal  = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice), 0);
  const gstTotal  = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice) * (Number(it.gstRate) / 100), 0);
  const grandTotal = subtotal + gstTotal;

  function buildPayload(status: string) {
    return {
      accountName, expiryDate: expiryDate || null, quoteStatus: status, notes, isTemplate,
      products: items.map(it => ({
        productName:       it.productName || "Item",
        description:       it.description,
        qty:               it.qty,
        unitPrice:         it.unitPrice,
        gstRate:           it.gstRate,
        total:             String(calcTotal(it).toFixed(2)),
        serviceModuleType: it.serviceModuleType || null,
      })),
    };
  }

  const saveMutation = useMutation({
    mutationFn: (status: string) => quoteId
      ? axios.put(`${BASE}/api/crm/quotes/${quoteId}`, buildPayload(status)).then(r => r.data)
      : axios.post(`${BASE}/api/crm/quotes`, buildPayload(status)).then(r => r.data),
    onSuccess: (data, status) => {
      qc.invalidateQueries({ queryKey: ["crm-quotes"] });
      toast({ title: status === "Sent" ? "Quote sent to client" : "Quote saved as draft" });
      if (!quoteId) navigate(`/admin/crm/quotes/${data.id}`);
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const convertMutation = useMutation({
    mutationFn: () => {
      const id = quoteId!;
      return axios.post(`${BASE}/api/crm/quotes/${id}/convert-to-contract`).then(r => r.data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["crm-quotes"] });
      setConvertModal(false);
      toast({ title: `✅ Contract created + ${data.activatedModules.length} service modules activated` });
      navigate(`/admin/contracts/${data.contractId}`);
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
  });

  const isNew = !quoteId;
  const title = isNew ? "New Quote" : `Edit Quote${existing?.quoteRefNumber ? ` — ${existing.quoteRefNumber}` : ""}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/crm/quotes")}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          <ArrowLeft size={16} /> Back to Quotes
        </button>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
        {existing?.quoteStatus && (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#F4F3F1] text-[#57534E]">
            {existing.quoteStatus}
          </span>
        )}
      </div>

      <div className="flex gap-6 items-start">
        {/* Left panel — 70% */}
        <div className="flex-1 space-y-6 min-w-0">

          {/* Quote Info */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Quote Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Customer / Account Name</Label>
                <Input value={accountName} onChange={e => setAccountName(e.target.value)} className="h-9 text-sm" placeholder="e.g. Kim Minjun" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Status</Label>
                <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Expiry Date</Label>
                <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-600">Save as Template</Label>
                <div className="flex items-center gap-2 h-9">
                  <input type="checkbox" id="is-template" checked={isTemplate}
                    onChange={e => setIsTemplate(e.target.checked)} className="rounded" />
                  <label htmlFor="is-template" className="text-sm text-stone-600">Yes, save as template</label>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-stone-600">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                className="text-sm min-h-[60px] resize-none" placeholder="Internal notes or terms…" />
            </div>
          </div>

          {/* Load Template */}
          <div className="flex items-center gap-3">
            <Label className="text-xs font-medium text-stone-600 shrink-0">Load Template:</Label>
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="h-9 text-sm w-72">
                <SelectValue placeholder="Select a template…" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Line Items */}
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            <div className="bg-stone-50 border-b border-stone-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-100">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-stone-400 font-medium w-36">Product</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-400 font-medium">Description</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-400 font-medium w-16">Qty</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-400 font-medium w-24">Unit Price</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-400 font-medium w-28">Module</th>
                    <th className="text-left px-3 py-2 text-xs text-stone-400 font-medium w-16">GST %</th>
                    <th className="text-right px-3 py-2 text-xs text-stone-400 font-medium w-24">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <Input value={item.productName}
                          onChange={e => updateItem(item.id, "productName", e.target.value)}
                          className="h-8 text-xs border-stone-200" placeholder="Product name" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={item.description}
                          onChange={e => updateItem(item.id, "description", e.target.value)}
                          className="h-8 text-xs border-stone-200" placeholder="Optional" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={1} value={item.qty}
                          onChange={e => updateItem(item.id, "qty", Number(e.target.value))}
                          className="h-8 text-xs border-stone-200 w-14" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={0} step="0.01" value={item.unitPrice}
                          onChange={e => updateItem(item.id, "unitPrice", e.target.value)}
                          className="h-8 text-xs border-stone-200" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          <Select value={item.serviceModuleType || "__none"}
                            onValueChange={v => updateItem(item.id, "serviceModuleType", v === "__none" ? "" : v)}>
                            <SelectTrigger className="h-8 text-xs border-stone-200">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">—</SelectItem>
                              {MODULE_OPTIONS.map(m => (
                                <SelectItem key={m} value={m}>{MODULE_LABELS[m]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.serviceModuleType && (
                            <span className="text-[10px] font-medium text-[#F5821F]">
                              {MODULE_LABELS[item.serviceModuleType]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Input type="number" min={0} max={100} value={item.gstRate}
                          onChange={e => updateItem(item.id, "gstRate", e.target.value)}
                          className="h-8 text-xs border-stone-200 w-14" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-stone-700 text-xs">
                        A${calcTotal(item).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(item.id)}
                          className="p-1 rounded hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-stone-100">
              <button onClick={() => setItems(prev => [...prev, newItem()])}
                className="flex items-center gap-1.5 text-sm text-[#F5821F] hover:underline font-medium">
                <Plus size={14} /> Add Line Item
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button onClick={() => saveMutation.mutate("Draft")} disabled={saveMutation.isPending}
              variant="outline" className="flex-1">
              {saveMutation.isPending ? "Saving…" : "Save Draft"}
            </Button>
            <Button onClick={() => saveMutation.mutate("Sent")} disabled={saveMutation.isPending}
              variant="outline" className="flex-1" style={{ borderColor: "#F5821F", color: "#F5821F" }}>
              Send to Client
            </Button>
            {quoteId && (
              <Button onClick={() => setConvertModal(true)}
                className="flex-1 text-white flex items-center gap-2"
                style={{ background: "#16A34A" }}>
                Convert to Contract <ChevronRight size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Right panel — 30% preview */}
        <div className="w-72 shrink-0 space-y-4 sticky top-6">
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-700">Quote Summary</h2>
              <FileDown size={14} className="text-stone-400" />
            </div>

            {accountName && (
              <div>
                <p className="text-xs text-stone-400">Customer</p>
                <p className="text-sm font-semibold text-stone-800">{accountName}</p>
              </div>
            )}
            {expiryDate && (
              <div>
                <p className="text-xs text-stone-400">Expires</p>
                <p className="text-sm text-stone-700">{format(new Date(expiryDate), "MMM d, yyyy")}</p>
              </div>
            )}

            <div className="border-t border-stone-100 pt-3 space-y-2">
              {items.filter(it => it.productName).map(it => (
                <div key={it.id} className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-700 truncate">{it.productName}</p>
                    {it.serviceModuleType && (
                      <p className="text-[10px] text-[#F5821F]">{MODULE_LABELS[it.serviceModuleType]}</p>
                    )}
                  </div>
                  <p className="text-xs font-medium text-stone-700 shrink-0">
                    A${calcTotal(it).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span>A${subtotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>GST</span>
                <span>A${gstTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-800 text-base border-t border-stone-200 pt-2">
                <span>TOTAL</span>
                <span>A${grandTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {items.some(it => it.serviceModuleType) && (
              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs text-stone-400 mb-2">Service Modules</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(items.map(it => it.serviceModuleType).filter(Boolean))].map(mod => (
                    <span key={mod} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FEF0E3] text-[#F5821F]">
                      {MODULE_LABELS[mod!]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Convert to Contract Modal */}
      {convertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-800">Convert to Contract</h3>
              <button onClick={() => setConvertModal(false)} className="p-1 rounded hover:bg-stone-100">
                <X size={16} className="text-stone-400" />
              </button>
            </div>
            <p className="text-sm text-stone-600">
              This will create a new contract and automatically activate service modules for:
            </p>
            <div className="flex flex-wrap gap-2">
              {[...new Set(items.map(it => it.serviceModuleType).filter(Boolean))].map(mod => (
                <span key={mod} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#16A34A]">
                  <Check size={11} /> {MODULE_LABELS[mod!]}
                </span>
              ))}
            </div>
            <p className="text-sm text-stone-500 bg-stone-50 rounded-lg p-3">
              The quote status will be updated to <strong>Accepted</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="flex-1 text-white"
                style={{ background: "#16A34A" }}
              >
                {convertMutation.isPending ? "Converting…" : "Confirm & Convert"}
              </Button>
              <Button variant="outline" onClick={() => setConvertModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
