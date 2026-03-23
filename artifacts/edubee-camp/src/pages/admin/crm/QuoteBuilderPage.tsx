import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Trash2, ArrowLeft, GripVertical, Search, X, Check, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const PRIMARY = "#F5821F";

// Stable empty array — must be outside component to avoid re-creating on every render
const EMPTY_LINES: QuoteProduct[] = [];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (s?: string | null) => !!s && UUID_RE.test(s);

// ─── Types ───────────────────────────────────────────────────────────────────

interface Quote {
  id: string;
  quoteRefNumber?: string;
  quoteStatus: string;
  expiryDate?: string;
  notes?: string;
  accountName?: string;
  customerName?: string;
  studentAccountId?: string;
  leadId?: string;
}

interface QuoteProduct {
  id: string;
  quoteId: string;
  productId?: string;
  manualInput: boolean;
  name?: string;
  itemDescription?: string;
  price?: string;
  quantity: number;
  isInitialPayment: boolean;
  dueDate?: string;
  sortIndex: number;
  isGstIncluded: boolean;
  status: string;
  providerName?: string;
}

interface Product {
  id: string;
  productName: string;
  productType?: string;
  description?: string;
  itemDescription?: string;
  price?: string;
  isGstIncluded?: boolean;
  numberOfPayments?: number;
  minimumPayment?: string;
  providerId?: string;
  providerName?: string;
}

interface Account {
  id: string;
  name: string;
  accountType?: string;
}

// ─── Account Lookup Field ─────────────────────────────────────────────────────

function AccountLookupField({
  currentId,
  currentName,
  onSelect,
}: {
  currentId?: string | null;
  currentName?: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Account | null>(
    currentId && currentName ? { id: currentId, name: currentName } : null,
  );
  const [pending, setPending] = useState<Account | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelected(currentId && currentName ? { id: currentId, name: currentName } : null);
  }, [currentId, currentName]);

  const { data: results = [] } = useQuery<Account[]>({
    queryKey: ["account-search-qb", query],
    queryFn: () =>
      axios
        .get(`${BASE}/api/crm/accounts?search=${encodeURIComponent(query)}&limit=20`)
        .then((r) => r.data.data ?? []),
    enabled: editing && query.length >= 1,
    staleTime: 10_000,
  });

  const startEdit = () => {
    setPending(selected);
    setQuery(selected?.name ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancel = () => {
    setPending(null);
    setQuery("");
    setEditing(false);
  };

  const pick = (acc: Account) => {
    setPending(acc);
    setQuery(acc.name);
  };

  const save = () => {
    setSelected(pending);
    onSelect(pending?.id ?? null, pending?.name ?? null);
    setEditing(false);
    setQuery("");
    setPending(null);
  };

  const clear = () => {
    setSelected(null);
    onSelect(null, null);
    setEditing(false);
    setQuery("");
    setPending(null);
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-h-8">
        {selected ? (
          <>
            <span className="text-sm font-medium text-gray-800">{selected.name}</span>
            <button
              onClick={startEdit}
              className="text-xs underline"
              style={{ color: PRIMARY }}
            >
              Change
            </button>
            <button onClick={clear} className="text-gray-400 hover:text-red-500">
              <X size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={startEdit}
            className="text-sm underline flex items-center gap-1"
            style={{ color: PRIMARY }}
          >
            <Search size={13} /> Select Account
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search account name…"
          className="h-8 text-sm"
        />
        <button onClick={save} className="text-green-600 hover:text-green-800">
          <Check size={16} />
        </button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="absolute top-9 left-0 z-50 bg-white border border-gray-200 rounded shadow-md w-80 max-h-52 overflow-y-auto">
          {results.map((acc) => (
            <button
              key={acc.id}
              onClick={() => pick(acc)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 ${
                pending?.id === acc.id ? "bg-orange-100 font-medium" : ""
              }`}
            >
              {acc.name}
              {acc.accountType && (
                <span className="ml-2 text-xs text-gray-400">({acc.accountType})</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Product Search Panel ─────────────────────────────────────────────────────

function ProductSearchPanel({ onAdd }: { onAdd: (p: Product) => void }) {
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("");
  const [open, setOpen] = useState(false);

  const { data: productData } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ["products-quote-search", search, provider],
    queryFn: () => {
      const params = new URLSearchParams({ display_on_quote: "true", status: "Active", limit: "50" });
      if (search) params.set("search", search);
      if (provider) params.set("provider", provider);
      return axios.get(`${BASE}/api/products?${params}`).then((r) => r.data);
    },
    enabled: open,
    staleTime: 30_000,
  });

  const { data: formData } = useQuery<{ providers?: Account[] }>({
    queryKey: ["product-form-data"],
    queryFn: () => axios.get(`${BASE}/api/product-form-data`).then((r) => r.data),
    staleTime: 60_000,
  });

  const providers: Account[] = formData?.providers ?? [];
  const products = productData?.data ?? [];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <Plus size={15} style={{ color: PRIMARY }} />
          Add Products from Catalog
        </span>
        <ChevronDown
          size={15}
          className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm flex-1 min-w-36"
            />
            <Select
              value={provider || "_all"}
              onValueChange={(v) => setProvider(v === "_all" ? "" : v)}
            >
              <SelectTrigger className="h-8 text-sm w-44">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Providers</SelectItem>
                {providers.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {search || provider ? "No products match your filters" : "Search to find products"}
            </p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded border border-gray-100 hover:border-orange-200 hover:bg-orange-50 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.productName}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {p.providerName && <span>{p.providerName} · </span>}
                      {p.productType}
                      {p.isGstIncluded ? " · GST incl." : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <span className="text-sm font-semibold text-gray-700">
                      {p.price
                        ? `$${Number(p.price).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </span>
                    <button
                      onClick={() => onAdd(p)}
                      className="opacity-0 group-hover:opacity-100 text-white text-xs px-2 py-1 rounded transition-all"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableRow({
  item,
  onDelete,
  onChange,
}: {
  item: QuoteProduct;
  onDelete: (id: string) => void;
  onChange: (id: string, field: string, value: unknown) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#fff7f0" : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-2 py-2 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-gray-300 hover:text-gray-500 touch-none"
        >
          <GripVertical size={15} />
        </button>
      </td>
      <td className="px-2 py-2">
        <input
          className="w-full text-sm border border-transparent rounded px-1 py-0.5 focus:border-orange-300 focus:outline-none bg-transparent hover:bg-white"
          value={item.name ?? ""}
          onChange={(e) => onChange(item.id, "name", e.target.value)}
        />
        <input
          className="w-full text-xs border border-transparent rounded px-1 py-0.5 focus:border-orange-300 focus:outline-none bg-transparent hover:bg-white text-gray-400 mt-0.5"
          value={item.itemDescription ?? ""}
          placeholder="Description…"
          onChange={(e) => onChange(item.id, "itemDescription", e.target.value)}
        />
      </td>
      <td className="px-2 py-2 w-28 text-xs text-gray-500 truncate max-w-[7rem]">
        {item.providerName ?? "—"}
      </td>
      <td className="px-2 py-2 w-20">
        <input
          type="number"
          min={1}
          className="w-full text-sm text-center border border-transparent rounded px-1 py-0.5 focus:border-orange-300 focus:outline-none bg-transparent hover:bg-white"
          value={item.quantity}
          onChange={(e) => onChange(item.id, "quantity", Number(e.target.value))}
        />
      </td>
      <td className="px-2 py-2 w-28">
        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-xs">$</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="w-full text-sm border border-transparent rounded px-1 py-0.5 focus:border-orange-300 focus:outline-none bg-transparent hover:bg-white"
            value={item.price ?? ""}
            onChange={(e) => onChange(item.id, "price", e.target.value)}
          />
        </div>
      </td>
      <td className="px-2 py-2 w-32">
        <input
          type="date"
          className="w-full text-xs border border-transparent rounded px-1 py-0.5 focus:border-orange-300 focus:outline-none bg-transparent hover:bg-white"
          value={item.dueDate ? item.dueDate.split("T")[0] : ""}
          onChange={(e) => onChange(item.id, "dueDate", e.target.value)}
        />
      </td>
      <td className="px-2 py-2 w-20 text-center">
        <input
          type="checkbox"
          checked={item.isInitialPayment}
          onChange={(e) => onChange(item.id, "isInitialPayment", e.target.checked)}
          className="accent-orange-500"
        />
      </td>
      <td className="px-2 py-2 w-24 text-right text-sm font-medium text-gray-700 tabular-nums">
        {item.price
          ? `$${(Number(item.price) * item.quantity).toLocaleString("en-AU", {
              minimumFractionDigits: 2,
            })}`
          : "—"}
      </td>
      <td className="px-2 py-2 w-10 text-center">
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

// ─── Manual Line Form ─────────────────────────────────────────────────────────

function ManualLineForm({ onAdd }: { onAdd: (line: Partial<QuoteProduct>) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name, itemDescription: description, price, quantity, manualInput: true });
    setName("");
    setDescription("");
    setPrice("");
    setQuantity(1);
    setOpen(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <Plus size={15} style={{ color: PRIMARY }} />
          Add Manual Line Item
        </span>
        <ChevronDown
          size={15}
          className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Item Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Airport Transfer"
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">Price (AUD)</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Qty</Label>
                <Input
                  type="number"
                  value={quantity}
                  min={1}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              className="h-8 text-sm mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!name.trim()}
              onClick={handleAdd}
              style={{ backgroundColor: PRIMARY }}
              className="text-white hover:opacity-90"
            >
              Add Line
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quote Summary ────────────────────────────────────────────────────────────

function QuoteSummary({ items }: { items: QuoteProduct[] }) {
  const grouped: Record<string, QuoteProduct[]> = {};
  for (const item of items) {
    const key = item.providerName ?? "Manual / Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }
  const grandTotal = items.reduce(
    (sum, item) => sum + Number(item.price ?? 0) * item.quantity,
    0,
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Quote Summary</h3>
      </div>
      <div className="p-4 space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No items</p>
        ) : (
          Object.entries(grouped).map(([providerKey, rows]) => {
            const subtotal = rows.reduce(
              (sum, r) => sum + Number(r.price ?? 0) * r.quantity,
              0,
            );
            return (
              <div key={providerKey}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {providerKey}
                  </span>
                  <span className="text-xs font-semibold text-gray-600 tabular-nums">
                    ${subtotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-0.5 pl-2">
                    <span className="text-gray-700 truncate flex-1">{r.name ?? "Item"}</span>
                    <span className="text-gray-400 text-xs ml-2 shrink-0">×{r.quantity}</span>
                    <span className="text-gray-700 ml-4 tabular-nums shrink-0">
                      $
                      {(Number(r.price ?? 0) * r.quantity).toLocaleString("en-AU", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
        <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">Total</span>
          <span className="text-base font-bold tabular-nums" style={{ color: PRIMARY }}>
            ${grandTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuoteBuilderPage() {
  const [match, params] = useRoute("/admin/crm/quotes/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const quoteId = params?.id;

  const [lines, setLines] = useState<QuoteProduct[]>([]);
  const [dirtyLines, setDirtyLines] = useState<Set<string>>(new Set());

  const [quoteStatus, setQuoteStatus] = useState("Draft");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [studentAccountId, setStudentAccountId] = useState<string | null>(null);
  const [studentAccountName, setStudentAccountName] = useState<string | null>(null);

  const validId = isValidUuid(quoteId);

  // ── Fetch Quote ─────────────────────────────────────────────────────────────
  const { data: quote, isLoading: quoteLoading } = useQuery<Quote>({
    queryKey: ["quote", quoteId],
    queryFn: () =>
      axios.get(`${BASE}/api/crm/quotes/${quoteId}`).then((r) => r.data),
    enabled: validId,
  });

  useEffect(() => {
    if (!quote) return;
    setQuoteStatus(quote.quoteStatus ?? "Draft");
    setExpiryDate(quote.expiryDate ?? "");
    setNotes(quote.notes ?? "");
    setCustomerName(quote.customerName ?? "");
    setStudentAccountId(quote.studentAccountId ?? null);
    setStudentAccountName(quote.accountName ?? null);
  }, [quote]);

  // ── Fetch Quote Products ────────────────────────────────────────────────────
  // Use a stable module-level constant as default — an inline [] creates a new
  // reference every render, causing this useEffect to fire in an infinite loop.
  const { data: serverLines = EMPTY_LINES } = useQuery<QuoteProduct[]>({
    queryKey: ["quote-products", quoteId],
    queryFn: () =>
      axios.get(`${BASE}/api/quote-products?quoteId=${quoteId}`).then((r) => r.data),
    enabled: validId,
  });

  useEffect(() => {
    setLines([...serverLines].sort((a, b) => a.sortIndex - b.sortIndex));
    setDirtyLines(new Set());
  }, [serverLines]);

  // ── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLines((prev) => {
      const oldIdx = prev.findIndex((l) => l.id === active.id);
      const newIdx = prev.findIndex((l) => l.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((l, i) => ({ ...l, sortIndex: i }));
    });
  };

  // ── Line Change ─────────────────────────────────────────────────────────────
  const handleLineChange = useCallback((id: string, field: string, value: unknown) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    setDirtyLines((prev) => new Set(prev).add(id));
  }, []);

  // ── Add Product from Catalog ─────────────────────────────────────────────────
  const addProductMutation = useMutation({
    mutationFn: (p: Product) =>
      axios.post(`${BASE}/api/quote-products`, {
        quote_id: quoteId,
        product_id: p.id,
        name: p.productName,
        item_description: p.itemDescription ?? p.description,
        price: p.price ?? "0",
        quantity: 1,
        is_gst_included: p.isGstIncluded ?? false,
        sort_index: lines.length,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-products", quoteId] }),
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  // ── Add Manual Line ─────────────────────────────────────────────────────────
  const addManualMutation = useMutation({
    mutationFn: (line: Partial<QuoteProduct>) =>
      axios.post(`${BASE}/api/quote-products`, {
        quote_id: quoteId,
        name: line.name,
        item_description: line.itemDescription,
        price: line.price ?? "0",
        quantity: line.quantity ?? 1,
        manual_input: true,
        sort_index: lines.length,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-products", quoteId] }),
    onError: () => toast({ title: "Failed to add line item", variant: "destructive" }),
  });

  // ── Delete Line ─────────────────────────────────────────────────────────────
  const deleteLine = async (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
    setDirtyLines((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    try {
      await axios.delete(`${BASE}/api/quote-products/${id}`);
      qc.invalidateQueries({ queryKey: ["quote-products", quoteId] });
    } catch {
      toast({ title: "Failed to delete item", variant: "destructive" });
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      await axios.put(`${BASE}/api/crm/quotes/${quoteId}`, {
        quoteStatus,
        expiryDate: expiryDate || null,
        notes,
        customerName,
        studentAccountId,
        accountName: studentAccountName,
      });

      const dirtyArr = Array.from(dirtyLines);
      await Promise.all(
        dirtyArr.map((id) => {
          const line = lines.find((l) => l.id === id);
          if (!line) return Promise.resolve();
          return axios.patch(`${BASE}/api/quote-products/${id}`, {
            name: line.name,
            item_description: line.itemDescription,
            price: line.price,
            quantity: line.quantity,
            is_initial_payment: line.isInitialPayment,
            due_date: line.dueDate || null,
          });
        }),
      );

      await axios.patch(`${BASE}/api/quote-products/reorder`, {
        quoteId,
        items: lines.map((l, i) => ({ id: l.id, sort_index: i })),
      });
    },
    onSuccess: () => {
      toast({ title: "Quote saved" });
      setDirtyLines(new Set());
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote-products", quoteId] });
    },
    onError: () => toast({ title: "Failed to save quote", variant: "destructive" }),
  });

  // ── Convert to Contract ─────────────────────────────────────────────────────
  const convertMutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/crm/quotes/${quoteId}/convert-to-contract`),
    onSuccess: () => {
      toast({ title: "Quote converted to contract" });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
    onError: (err: any) =>
      toast({
        title: err?.response?.data?.error ?? "Failed to convert",
        variant: "destructive",
      }),
  });

  if (!validId) {
    return (
      <div className="p-8 text-center text-gray-400">
        Invalid quote ID.
        <br />
        <button
          onClick={() => navigate("/admin/crm/quotes")}
          className="underline mt-2 block mx-auto"
          style={{ color: PRIMARY }}
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  if (quoteLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-8 text-center text-gray-400">
        Quote not found.
        <br />
        <button
          onClick={() => navigate("/admin/crm/quotes")}
          className="underline mt-2 block mx-auto"
          style={{ color: PRIMARY }}
        >
          Back to Quotes
        </button>
      </div>
    );
  }

  const isSaving = saveMutation.isPending;
  const activeLines = lines.filter((l) => !l.status || l.status === "Active");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              navigate(
                quote.leadId ? `/admin/crm/leads/${quote.leadId}` : "/admin/crm/quotes",
              )
            }
            className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-gray-800">
              {quote.quoteRefNumber ?? "Quote Builder"}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                quoteStatus === "Accepted"
                  ? "bg-green-100 text-green-700"
                  : quoteStatus === "Sent"
                    ? "bg-blue-100 text-blue-700"
                    : quoteStatus === "Declined"
                      ? "bg-red-100 text-red-700"
                      : quoteStatus === "Expired"
                        ? "bg-gray-200 text-gray-600"
                        : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {quoteStatus}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {quoteStatus !== "Accepted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending || activeLines.length === 0}
              className="text-sm"
            >
              Convert to Contract
            </Button>
          )}
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => saveMutation.mutate()}
            style={{ backgroundColor: PRIMARY }}
            className="text-white hover:opacity-90 text-sm"
          >
            {isSaving ? "Saving…" : "Save Quote"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-3 gap-6">
        {/* Left column: 2/3 */}
        <div className="col-span-2 space-y-5">
          {/* Quote Header Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
              Quote Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Customer Name</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <Select value={quoteStatus} onValueChange={setQuoteStatus}>
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Draft", "Sent", "Accepted", "Declined", "Expired"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Student Account</Label>
                <div className="mt-1">
                  <AccountLookupField
                    currentId={studentAccountId}
                    currentName={studentAccountName}
                    onSelect={(id, name) => {
                      setStudentAccountId(id);
                      setStudentAccountName(name);
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Expiry Date</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes…"
                rows={2}
                className="text-sm mt-1 resize-none"
              />
            </div>
          </div>

          {/* Product Search */}
          <ProductSearchPanel onAdd={(p) => addProductMutation.mutate(p)} />

          {/* Manual Line */}
          <ManualLineForm onAdd={(line) => addManualMutation.mutate(line as any)} />

          {/* Payment Plan Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Payment Plan</h3>
              <span className="text-xs text-gray-400">
                {activeLines.length} item{activeLines.length !== 1 ? "s" : ""}
              </span>
            </div>

            {activeLines.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <p>No items yet.</p>
                <p className="text-xs mt-1">
                  Add products from the catalog or create a manual line above.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activeLines.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium bg-gray-50">
                          <th className="px-2 py-2 w-8" />
                          <th className="px-2 py-2 text-left">Item</th>
                          <th className="px-2 py-2 text-left w-28">Provider</th>
                          <th className="px-2 py-2 text-center w-20">Qty</th>
                          <th className="px-2 py-2 text-left w-28">Price</th>
                          <th className="px-2 py-2 text-left w-32">Due Date</th>
                          <th className="px-2 py-2 text-center w-20">Initial?</th>
                          <th className="px-2 py-2 text-right w-24">Subtotal</th>
                          <th className="px-2 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {activeLines.map((item) => (
                          <SortableRow
                            key={item.id}
                            item={item}
                            onDelete={deleteLine}
                            onChange={handleLineChange}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Right column: 1/3 */}
        <div className="col-span-1 space-y-4">
          <QuoteSummary items={activeLines} />

          {/* Quick Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Quote Ref</span>
              <span className="font-mono text-gray-700 text-xs">
                {quote.quoteRefNumber ?? "—"}
              </span>
            </div>
            {quote.leadId && (
              <div className="flex justify-between text-gray-500">
                <span>Lead</span>
                <button
                  onClick={() => navigate(`/admin/crm/leads/${quote.leadId}`)}
                  className="text-xs underline"
                  style={{ color: PRIMARY }}
                >
                  View Lead
                </button>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Line Items</span>
              <span className="text-gray-700">{activeLines.length}</span>
            </div>
            {activeLines.some((l) => l.isInitialPayment) && (
              <div className="flex justify-between text-gray-500">
                <span>Initial Payment</span>
                <span className="text-gray-700 font-medium tabular-nums">
                  $
                  {activeLines
                    .filter((l) => l.isInitialPayment)
                    .reduce((s, l) => s + Number(l.price ?? 0) * l.quantity, 0)
                    .toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {dirtyLines.size > 0 && (
              <p className="text-xs text-amber-600 pt-1">
                Unsaved changes — click Save Quote to apply.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
