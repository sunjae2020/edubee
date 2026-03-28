import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
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
  Mail, Printer, UserPlus, Building2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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
  originalName?: string;
  studentAccountId?: string;
  leadId?: string;
  campApplicationId?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
}

interface QuoteProduct {
  id: string;
  quoteId: string;
  productId?: string;
  manualInput: boolean;
  name?: string;
  productName?: string;
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
  serviceModuleType?: string;
  description?: string;
  itemDescription?: string;
  price?: string;
  isGstIncluded?: boolean;
  defaultPaymentTerm?: string;
  installmentPlan?: string;
  numberOfPayments?: number;
  minimumPayment?: string;
  providerId?: string;
  providerName?: string;
}

// ─── Installment Builder ──────────────────────────────────────────────────────

function buildInstallmentItems(p: Product, startSortIndex: number) {
  const total   = Math.max(0, Number(p.price ?? 0));
  const term    = p.defaultPaymentTerm ?? "Once";
  const n       = term === "Once" ? 1 : Math.max(1, p.numberOfPayments ?? 1);
  const desc    = p.itemDescription ?? p.description ?? null;
  const gst     = p.isGstIncluded ?? false;
  const smt     = p.serviceModuleType ?? null;

  if (n === 1) {
    return [{
      product_id:          p.id,
      name:                p.productName,
      item_description:    desc,
      price:               total.toFixed(2),
      quantity:            1,
      is_gst_included:     gst,
      is_initial_payment:  true,
      sort_index:          startSortIndex,
      service_module_type: smt,
    }];
  }

  const minPay = Math.min(Math.max(0, Number(p.minimumPayment ?? 0)), total);
  const remaining = total - minPay;
  const perPayment = n > 1 ? remaining / (n - 1) : 0;

  const items = [];
  let allocated = minPay;
  for (let i = 0; i < n; i++) {
    let amt: number;
    if (i === 0) {
      amt = minPay;
    } else if (i === n - 1) {
      amt = total - allocated; // absorb rounding diff
    } else {
      amt = parseFloat(perPayment.toFixed(2));
      allocated += amt;
    }
    items.push({
      product_id:          p.id,
      name:                p.productName,
      item_description:    desc,
      price:               Math.max(0, amt).toFixed(2),
      quantity:            1,
      is_gst_included:     gst,
      is_initial_payment:  i === 0,
      sort_index:          startSortIndex + i,
      service_module_type: smt,
    });
  }
  return items;
}

// ─── Group Type ───────────────────────────────────────────────────────────────

interface LineGroup {
  key:          string;
  productId:    string | null;
  isManual:     boolean;
  label:        string;
  providerName: string | null;
  rows:         QuoteProduct[];
  groupTotal:   number;
}

interface Account {
  id: string;
  name: string;
  accountType?: string;
}

// ─── Account Lookup Field ─────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  "Client", "Agent", "Institute", "Hotel", "Tour Operator", "Pickup", "Other",
];

function AccountLookupField({
  currentId,
  currentName,
  onSelect,
}: {
  currentId?: string | null;
  currentName?: string | null;
  onSelect: (id: string | null, name: string | null) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Account | null>(
    currentId && currentName ? { id: currentId, name: currentName } : null,
  );
  const [pending, setPending] = useState<Account | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  // New account form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Client");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click-outside to close
  useEffect(() => {
    if (!editing) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        if (!showCreate) cancel();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing, showCreate]);

  const startEdit = () => {
    setPending(selected);
    setQuery(selected?.name ?? "");
    setEditing(true);
    setShowCreate(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancel = () => {
    setPending(null);
    setQuery("");
    setEditing(false);
    setShowCreate(false);
    resetCreateForm();
  };

  const pick = (acc: Account) => {
    setSelected(acc);
    onSelect(acc.id, acc.name);
    setEditing(false);
    setQuery("");
    setPending(null);
    setShowCreate(false);
  };

  const clear = () => {
    setSelected(null);
    onSelect(null, null);
    setEditing(false);
    setQuery("");
    setPending(null);
    setShowCreate(false);
  };

  const resetCreateForm = () => {
    setNewName("");
    setNewType("Client");
    setNewEmail("");
    setNewPhone("");
  };

  const openCreate = () => {
    setNewName(query);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Account name is required", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "User session not found", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post(`${BASE}/api/crm/accounts`, {
        name:         newName.trim(),
        accountType:  newType,
        email:        newEmail.trim() || undefined,
        phoneNumber:  newPhone.trim() || undefined,
        ownerId:      user.id,
        manualInput:  true,
        status:       "Active",
      });
      const created = res.data;
      toast({ title: "Account created", description: `"${created.name}" has been added.` });
      qc.invalidateQueries({ queryKey: ["account-search-qb"] });
      pick({ id: created.id, name: created.name, accountType: created.accountType });
      resetCreateForm();
    } catch (err: any) {
      toast({
        title: "Failed to create account",
        description: err?.response?.data?.error ?? err.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2 min-h-8">
        {selected ? (
          <>
            <Building2 size={14} className="text-[#F5821F] shrink-0" />
            <span className="text-sm font-medium text-gray-800">{selected.name}</span>
            {(selected as any).accountType && (
              <span className="text-xs text-gray-400">({(selected as any).accountType})</span>
            )}
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
            className="w-full text-left text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-colors text-gray-400 hover:text-gray-700"
          >
            <Search size={13} style={{ color: PRIMARY }} />
            Search or create account…
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowCreate(false); }}
            placeholder="Search account name…"
            className="h-8 text-sm pl-8"
          />
        </div>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600" title="Cancel">
          <X size={16} />
        </button>
      </div>

      {/* Dropdown */}
      {(results.length > 0 || query.length >= 1) && !showCreate && (
        <div className="absolute top-9 left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-full min-w-[280px] max-h-60 overflow-y-auto">
          {results.map((acc) => (
            <button
              key={acc.id}
              onClick={() => pick(acc)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-orange-50 flex items-center gap-2 border-b border-gray-50 last:border-0 ${
                pending?.id === acc.id ? "bg-orange-100 font-medium" : ""
              }`}
            >
              <Building2 size={13} className="text-gray-400 shrink-0" />
              <span className="flex-1 truncate">{acc.name}</span>
              {acc.accountType && (
                <span className="text-xs text-gray-400 shrink-0">({acc.accountType})</span>
              )}
            </button>
          ))}
          {/* Always show "Create new" option */}
          <button
            onClick={openCreate}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-green-50 flex items-center gap-2 border-t border-gray-100 text-green-700 font-medium"
          >
            <UserPlus size={13} className="shrink-0" />
            {query.trim()
              ? `Create "${query.trim()}"`
              : "Create new account…"}
          </button>
        </div>
      )}

      {/* Inline create form */}
      {showCreate && (
        <div className="mt-2 border border-green-200 rounded-lg bg-green-50 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={14} className="text-green-700" />
            <span className="text-sm font-semibold text-green-800">New Account</span>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. John Smith"
              className="h-8 text-sm bg-white"
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Account Type <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    newType === t
                      ? "bg-[#F5821F] text-white border-[#F5821F]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-8 text-sm bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone</label>
              <Input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="+61 4xx xxx xxx"
                className="h-8 text-sm bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 h-8 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back to search
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex-1 h-8 rounded text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {creating ? "Creating…" : "Create & Select"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Search Panel ─────────────────────────────────────────────────────

function ProductSearchPanel({ onAdd }: { onAdd: (p: Product) => void }) {
  const [open, setOpen] = useState(true);
  const [search,       setSearch]       = useState("");
  const [productGroup, setProductGroup] = useState("");
  const [productType,  setProductType]  = useState("");
  const [priority,     setPriority]     = useState("");
  const [grade,        setGrade]        = useState("");
  const [status,       setStatus]       = useState("active");
  const [country,      setCountry]      = useState("");
  const [location,     setLocation]     = useState("");

  // Debounced search text (300ms) — prevents API call on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Lookup data
  const { data: groupsData = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["product-groups-lookup"],
    queryFn: () => axios.get(`${BASE}/api/product-groups?status=Active`).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: typesData = [] } = useQuery<{ id: string; name: string; productGroupId: string }[]>({
    queryKey: ["product-types-lookup", productGroup],
    queryFn: () => {
      const params = new URLSearchParams({ status: "Active" });
      if (productGroup) params.set("product_group_id", productGroup);
      return axios.get(`${BASE}/api/product-types?${params}`).then((r) => r.data);
    },
    staleTime: 60_000,
  });

  const { data: providersData = [] } = useQuery<{ id: string; name: string; country?: string; location?: string }[]>({
    queryKey: ["products-lookup-accounts"],
    queryFn: () => axios.get(`${BASE}/api/products-lookup/accounts`).then((r) => r.data),
    staleTime: 60_000,
  });

  // Derive distinct country and location options from providers
  const countryOptions = Array.from(new Set(providersData.map((p) => p.country).filter(Boolean))) as string[];
  const locationOptions = Array.from(
    new Set(
      providersData.flatMap((p) =>
        (p.location ?? "").split(",").map((s) => s.trim()).filter(Boolean)
      )
    )
  ).sort() as string[];

  // Only fetch when at least one meaningful filter is active (status alone is not enough)
  const hasActiveFilter = !!(debouncedSearch || productGroup || productType || priority || grade || country || location);

  const { data: productData, isFetching } = useQuery<{ data: Product[]; total: number }>({
    queryKey: ["products-quote-search", { debouncedSearch, productGroup, productType, priority, grade, status, country, location }],
    queryFn: () => {
      const params = new URLSearchParams({ display_on_quote: "true", limit: "100" });
      if (debouncedSearch) params.set("search",          debouncedSearch);
      if (productGroup)    params.set("productGroup",    productGroup);
      if (productType)     params.set("productTypeId",   productType);
      if (priority)        params.set("productPriority", priority);
      if (grade)           params.set("productGrade",    grade);
      if (status)          params.set("status",          status);
      if (country)         params.set("country",         country);
      if (location)        params.set("location",        location);
      return axios.get(`${BASE}/api/products?${params}`).then((r) => r.data);
    },
    enabled: hasActiveFilter,
    staleTime: 0,
  });

  const products = productData?.data ?? [];

  // Reset productType when group changes
  const handleGroupChange = (v: string) => {
    setProductGroup(v === "_all" ? "" : v);
    setProductType("");
  };

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
      <div className="p-4 space-y-4">
        {/* Advanced Search Filters */}
        <div className="space-y-3">
          {/* Row 1: Group / Type / Priority / Grade */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Product Group</label>
              <Select value={productGroup || "_all"} onValueChange={handleGroupChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Groups</SelectItem>
                  {groupsData.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Product Type</label>
              <Select value={productType || "_all"} onValueChange={(v) => setProductType(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Types</SelectItem>
                  {typesData.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Priority</label>
              <Select value={priority || "_any"} onValueChange={(v) => setPriority(v === "_any" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Any</SelectItem>
                  <SelectItem value="1">1 — Highest</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5 — Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Grade</label>
              <Select value={grade || "_any"} onValueChange={(v) => setGrade(v === "_any" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Any</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Elementary">Elementary</SelectItem>
                  <SelectItem value="Pre-Intermediate">Pre-Intermediate</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Upper-Intermediate">Upper-Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</label>
              <Select value={status || "_all"} onValueChange={(v) => setStatus(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Country / Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Country</label>
              <Select value={country || "_all"} onValueChange={(v) => setCountry(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Countries</SelectItem>
                  {countryOptions.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Location</label>
              <Select value={location || "_all"} onValueChange={(v) => setLocation(v === "_all" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Locations</SelectItem>
                  {locationOptions.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Text search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search by product name or provider…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-7"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {!hasActiveFilter ? (
          <p className="text-sm text-gray-400 text-center py-6">Enter a search term or select a filter to find products.</p>
        ) : isFetching ? (
          <div className="py-6 flex justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200" style={{ borderTopColor: PRIMARY }} />
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No products match your filters.</p>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-1">{productData?.total ?? products.length} result{(productData?.total ?? products.length) !== 1 ? "s" : ""}</p>
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

const ORDINAL = ["1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th"];
function ordinal(n: number) { return ORDINAL[n - 1] ?? `${n}th`; }

function SortableRow({
  item,
  onDelete,
  onChange,
  installmentIdx = 0,
  installmentTotal = 1,
}: {
  item: QuoteProduct;
  onDelete: (id: string) => void;
  onChange: (id: string, field: string, value: unknown) => void;
  installmentIdx?: number;
  installmentTotal?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#fff7f0" : undefined,
  };

  const showInstallmentBadge = installmentTotal > 1 && installmentIdx > 0;

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
        {showInstallmentBadge && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 uppercase tracking-wide">
              {ordinal(installmentIdx)} Payment
            </span>
          </div>
        )}
        <input
          className="w-full text-sm border border-transparent rounded px-1 py-0.5 focus:border-orange-300 focus:outline-none bg-transparent hover:bg-white"
          value={item.name || item.productName || ""}
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
  // Virtual groupId — used so that installments added via + button on
  // this group share the same UUID key. Regenerated after each successful
  // add so the next manual item starts its own independent group.
  const [groupId, setGroupId] = useState(() => crypto.randomUUID());

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name, itemDescription: description, price, quantity, manualInput: true, productId: groupId });
    setName("");
    setDescription("");
    setPrice("");
    setQuantity(1);
    setGroupId(crypto.randomUUID()); // fresh UUID for the next separate manual item
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500">Item Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Airport Transfer"
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    <span className="text-gray-700 truncate flex-1">{r.name || r.productName || "Item"}</span>
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
  const [originalName, setOriginalName] = useState("");
  const [studentAccountId, setStudentAccountId] = useState<string | null>(null);
  const [studentAccountName, setStudentAccountName] = useState<string | null>(null);
  const [clientAccountEmail, setClientAccountEmail] = useState<string | null>(null);
  const [clientFirstName,    setClientFirstName]    = useState<string | null>(null);
  const [clientLastName,     setClientLastName]     = useState<string | null>(null);
  const [clientOriginalName, setClientOriginalName] = useState<string | null>(null);
  const [clientEnglishName,  setClientEnglishName]  = useState<string | null>(null);
  const [linkedContractId, setLinkedContractId] = useState<string | null>(null);
  const [linkedContractNumber, setLinkedContractNumber] = useState<string | null>(null);

  // Email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

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
    setOriginalName(quote.originalName ?? "");
    setStudentAccountId(quote.studentAccountId ?? null);
    setStudentAccountName(quote.accountName ?? null);
    setLinkedContractId(quote.contractId ?? null);
    setLinkedContractNumber(quote.contractNumber ?? null);
  }, [quote]);

  // ── Fetch linked Camp Application (if any) ──────────────────────────────────
  const { data: campAppData } = useQuery({
    queryKey: ["camp-application-for-quote", quote?.campApplicationId],
    queryFn: () =>
      axios.get(`${BASE}/api/camp-applications/${quote!.campApplicationId}`).then(r => r.data),
    enabled: !!quote?.campApplicationId && isValidUuid(quote?.campApplicationId),
  });
  const campApp = campAppData?.data ?? campAppData;

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

  // ── Fetch client account details when account changes ───────────────────────
  useEffect(() => {
    if (!studentAccountId) {
      setClientAccountEmail(null);
      setClientFirstName(null);
      setClientLastName(null);
      setClientOriginalName(null);
      setClientEnglishName(null);
      return;
    }
    axios.get(`${BASE}/api/crm/accounts/${studentAccountId}`)
      .then((r) => {
        const d = r.data ?? {};
        setClientAccountEmail(d.email ?? null);
        setClientFirstName(d.firstName ?? null);
        setClientLastName(d.lastName ?? null);
        setClientOriginalName(d.originalName ?? null);
        setClientEnglishName(d.englishName ?? null);
      })
      .catch(() => {
        setClientAccountEmail(null);
        setClientFirstName(null);
        setClientLastName(null);
        setClientOriginalName(null);
        setClientEnglishName(null);
      });
  }, [studentAccountId]);

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

  // ── Add Product from Catalog (auto-generates installments) ──────────────────
  const addProductMutation = useMutation({
    mutationFn: async (p: Product) => {
      const items = buildInstallmentItems(p, lines.length);
      if (items.length === 1) {
        return axios.post(`${BASE}/api/quote-products`, {
          quote_id: quoteId,
          ...items[0],
        });
      }
      return axios.post(`${BASE}/api/quote-products/bulk`, {
        quoteId,
        items,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-products", quoteId] }),
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  // ── Add Manual Line ─────────────────────────────────────────────────────────
  const addManualMutation = useMutation({
    mutationFn: (line: Partial<QuoteProduct>) =>
      axios.post(`${BASE}/api/quote-products`, {
        quote_id:    quoteId,
        product_id:  line.productId ?? undefined,
        name:        line.name,
        item_description: line.itemDescription,
        price:       line.price ?? "0",
        quantity:    line.quantity ?? 1,
        manual_input: true,
        sort_index:  lines.length,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-products", quoteId] }),
    onError: () => toast({ title: "Failed to add line item", variant: "destructive" }),
  });

  // ── Add Installment (supports catalog + manual groups) ───────────────────────
  const addInstallmentMutation = useMutation({
    mutationFn: async ({ productId, productName, manualInput, existingRowIds }: {
      productId:      string | null;
      productName:    string;
      manualInput:    boolean;
      existingRowIds: string[];
    }) => {
      let resolvedProductId = productId;

      // Old manual groups have no productId yet. Assign a new virtual UUID
      // and backfill all existing rows in the group so they share the same key.
      if (manualInput && !resolvedProductId) {
        resolvedProductId = crypto.randomUUID();
        await Promise.all(
          existingRowIds.map((id) =>
            axios.patch(`${BASE}/api/quote-products/${id}`, { product_id: resolvedProductId })
          )
        );
      }

      return axios.post(`${BASE}/api/quote-products`, {
        quote_id:           quoteId,
        product_id:         resolvedProductId ?? undefined,
        name:               productName,
        price:              "0.00",
        quantity:           1,
        is_initial_payment: false,
        manual_input:       manualInput,
        sort_index:         lines.length,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote-products", quoteId] }),
    onError: () => toast({ title: "Failed to add installment", variant: "destructive" }),
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

  // ── Send Email ───────────────────────────────────────────────────────────────
  const sendEmailMutation = useMutation({
    mutationFn: () =>
      axios.post(`${BASE}/api/crm/quotes/${quoteId}/send-email`, {
        to:      emailTo,
        subject: emailSubject,
        message: emailBody,
      }),
    onSuccess: (res) => {
      const mocked = res.data?.mocked;
      toast({
        title: mocked ? "Email logged (SMTP not configured)" : "Email sent successfully",
        description: mocked ? "Configure SMTP in Settings to send real emails." : `Sent to ${emailTo}`,
      });
      setEmailDialogOpen(false);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send email",
        description: err?.response?.data?.error ?? "Unknown error",
        variant: "destructive",
      }),
  });

  // ── Print / PDF ──────────────────────────────────────────────────────────────
  const printQuote = () => {
    if (!quote) return;
    const total = activeLines.reduce((s, l) => s + Number(l.price ?? 0) * (l.quantity ?? 1), 0);
    const rows = activeLines.map((l) => `
      <tr>
        <td>${l.name || l.productName || "Item"}</td>
        <td>${l.itemDescription ?? ""}</td>
        <td style="text-align:center">${l.quantity ?? 1}</td>
        <td style="text-align:right">$${Number(l.price ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">$${(Number(l.price ?? 0) * (l.quantity ?? 1)).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Quote ${quote.quoteRefNumber ?? ""}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;color:#333;padding:32px;font-size:13px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:3px solid #F5821F}
        .brand{font-size:22px;font-weight:700;color:#F5821F}
        .ref{font-size:13px;color:#888;margin-top:4px}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:28px;background:#fdf8f4;padding:16px;border-radius:6px;font-size:12px}
        .meta-label{color:#888;margin-bottom:1px}
        .meta-value{font-weight:600;color:#333}
        table{width:100%;border-collapse:collapse;margin-bottom:20px}
        th{background:#fdf8f4;padding:10px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e0db}
        td{padding:9px 12px;border-bottom:1px solid #f0ece8;vertical-align:top}
        .total-row td{font-weight:700;font-size:15px;border-top:2px solid #e5e0db;border-bottom:none;padding-top:14px}
        .total-row td:last-child{color:#F5821F;font-size:18px}
        .footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center}
        @media print{body{padding:16px}.no-print{display:none}}
      </style>
    </head><body>
      <div class="header">
        <div><div class="brand">Edubee Camp</div><div class="ref">Quote ${quote.quoteRefNumber ?? ""}</div></div>
        <div style="text-align:right;font-size:12px;color:#888">
          ${quote.expiryDate ? `<div>Expiry: ${quote.expiryDate}</div>` : ""}
          <div style="margin-top:4px;font-size:11px;background:#${quoteStatus === "Accepted" ? "d1fae5;color:#065f46" : quoteStatus === "Sent" ? "dbeafe;color:#1e40af" : "fef3c7;color:#92400e"};padding:2px 8px;border-radius:999px;display:inline-block">${quoteStatus}</div>
        </div>
      </div>
      <div class="meta">
        ${customerName ? `<div><div class="meta-label">Customer Name</div><div class="meta-value">${customerName}</div></div>` : ""}
        ${studentAccountName ? `<div><div class="meta-label">Client Account</div><div class="meta-value">${studentAccountName}${clientAccountEmail ? `<br><span style="font-weight:400;color:#888">${clientAccountEmail}</span>` : ""}</div></div>` : ""}
      </div>
      <table>
        <thead><tr>
          <th>Item / Payment</th><th>Description</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Amount</th>
          <th style="text-align:right">Subtotal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row">
          <td colspan="4" style="text-align:right">Total</td>
          <td style="text-align:right">$${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</td>
        </tr></tfoot>
      </table>
      ${notes ? `<div style="background:#fdf8f4;padding:12px 16px;border-radius:6px;font-size:12px;color:#666;margin-bottom:16px"><strong>Notes:</strong> ${notes}</div>` : ""}
      <div class="footer">Generated by Edubee Camp CRM</div>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      await axios.put(`${BASE}/api/crm/quotes/${quoteId}`, {
        quoteStatus,
        expiryDate: expiryDate || null,
        notes,
        customerName,
        originalName: originalName || null,
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
    onSuccess: (res) => {
      toast({ title: "Quote converted to contract" });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      const contractId = res.data?.contractId;
      if (contractId) {
        setLinkedContractId(contractId);
        setLinkedContractNumber(res.data?.contractNumber ?? null);
        navigate(`/admin/crm/contracts/${contractId}`);
      }
    },
    onError: (err: any) =>
      toast({
        title: err?.response?.data?.error ?? "Failed to convert",
        variant: "destructive",
      }),
  });

  // ── Computed values (must be before early returns — Rules of Hooks) ──────────
  const activeLines = lines.filter((l) => !l.status || l.status === "Active");

  const groups = useMemo((): LineGroup[] => {
    const seen = new Map<string, LineGroup>();
    const order: string[] = [];
    for (const line of activeLines) {
      // Catalog items: group by productId.
      // Manual items WITH a virtual groupId stored in productId: group by that UUID.
      // Legacy manual items with no productId: each is its own group.
      const key = line.productId ?? `manual_${line.id}`;
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          productId:    line.productId ?? null,
          isManual:     !!line.manualInput,
          label:        line.name || line.productName || "Item",
          providerName: line.providerName ?? null,
          rows:         [],
          groupTotal:   0,
        });
        order.push(key);
      }
      const g = seen.get(key)!;
      g.rows.push(line);
      g.groupTotal += Number(line.price ?? 0) * (line.quantity ?? 1);
    }
    return order.map(k => seen.get(k)!);
  }, [activeLines]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/crm/quotes")}
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
          {/* Send Email */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEmailTo(clientAccountEmail ?? "");
              setEmailSubject(`Quote ${quote.quoteRefNumber ?? ""} from Edubee Camp`);
              setEmailBody("");
              setEmailDialogOpen(true);
            }}
            className="text-sm border-gray-300 text-gray-600 hover:bg-gray-50 gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            Send Email
          </Button>

          {/* Print PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={printQuote}
            className="text-sm border-gray-300 text-gray-600 hover:bg-gray-50 gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print PDF
          </Button>

          {quoteStatus === "Accepted" && linkedContractId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/crm/contracts/${linkedContractId}`)}
              className="text-sm border-green-500 text-green-700 hover:bg-green-50 gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {linkedContractNumber ?? "View Contract"}
            </Button>
          ) : quoteStatus !== "Declined" && quoteStatus !== "Expired" && quoteStatus !== "Accepted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending || activeLines.length === 0}
              className="text-sm border-[#F5821F] text-[#F5821F] hover:bg-[#FEF0E3]"
            >
              {convertMutation.isPending ? "Converting…" : "Convert to Contract"}
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

      {/* Camp Application Badge */}
      {quote?.campApplicationId && (
        <div className="bg-white border-b border-gray-100 px-6 py-2">
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#FEF0E3",
            border: "1px solid rgba(245,130,31,0.3)",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            color: "#F5821F",
          }}>
            <span>📋</span>
            <span>
              From Camp Application:{" "}
              <strong>{campApp?.applicationRef ?? "Loading…"}</strong>
              {campApp?.applicantName ? ` (${campApp.applicantName})` : ""}
            </span>
            <button
              onClick={() => navigate(`/admin/camp-applications/${quote.campApplicationId}`)}
              style={{ fontWeight: 600, cursor: "pointer", background: "none", border: "none", color: "#F5821F", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              View →
            </button>
          </div>
        </div>
      )}

      {/* Content — single column, sections in order */}
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* 1. Quote Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            Quote Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label className="text-xs text-gray-500">Original Name</Label>
              <Input
                value={originalName}
                onChange={(e) => setOriginalName(e.target.value)}
                placeholder="e.g. 홍길동"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Client Account</Label>
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
              {studentAccountId && (
                <div className="mt-2 space-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
                  {[
                    ["First Name",             clientFirstName],
                    ["Last Name",              clientLastName],
                    ["Original Name",          clientOriginalName],
                    ["English Name (Nick Name)", clientEnglishName],
                    ["Email",                  clientAccountEmail],
                  ].map(([label, value]) => value ? (
                    <div key={label as string} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 text-gray-400">{label}</span>
                      <span className="text-gray-700 truncate">{value}</span>
                    </div>
                  ) : null)}
                </div>
              )}
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

        {/* 2. Add Products from Catalog */}
        <ProductSearchPanel onAdd={(p) => addProductMutation.mutate(p)} />

        {/* 3. Add Manual Line Item */}
        <ManualLineForm onAdd={(line) => addManualMutation.mutate(line as any)} />

        {/* 4. Payment Plan */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Payment Plan</h3>
            <span className="text-xs text-gray-400">
              {groups.length} product{groups.length !== 1 ? "s" : ""} · {activeLines.length} payment{activeLines.length !== 1 ? "s" : ""}
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
                        <th className="px-2 py-2 text-left">Item / Payment</th>
                        <th className="px-2 py-2 text-left w-28">Provider</th>
                        <th className="px-2 py-2 text-center w-20">Qty</th>
                        <th className="px-2 py-2 text-left w-28">Amount</th>
                        <th className="px-2 py-2 text-left w-32">Due Date</th>
                        <th className="px-2 py-2 text-center w-20">Initial?</th>
                        <th className="px-2 py-2 text-right w-24">Subtotal</th>
                        <th className="px-2 py-2 w-10" />
                      </tr>
                    </thead>
                    {groups.map((group) => (
                      <tbody key={group.key}>
                        {/* ── Group Header Row ── */}
                        <tr className="bg-orange-50 border-t-2 border-orange-100">
                          <td className="w-8" />
                          <td className="px-2 py-1.5" colSpan={5}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-gray-700">
                                {group.label}
                              </span>
                              {group.providerName && (
                                <span className="text-xs text-gray-400">· {group.providerName}</span>
                              )}
                              <span className="ml-auto text-xs font-semibold text-gray-600 tabular-nums">
                                Total ${group.groupTotal.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-right" colSpan={3}>
                            {/* Installment count +/− controls — all groups */}
                            <div className="flex items-center gap-1 ml-auto w-fit">
                              <span className="text-[10px] text-gray-400 mr-0.5 hidden sm:inline">Payments</span>
                              <button
                                onClick={() => deleteLine(group.rows[group.rows.length - 1].id)}
                                disabled={group.rows.length <= 1 || addInstallmentMutation.isPending}
                                title="Remove last installment"
                                className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
                              >
                                −
                              </button>
                              <span className="w-5 text-center text-xs font-semibold text-gray-700 tabular-nums">
                                {group.rows.length}
                              </span>
                              <button
                                onClick={() => addInstallmentMutation.mutate({
                                  productId:      group.productId,
                                  productName:    group.label,
                                  manualInput:    group.isManual,
                                  existingRowIds: group.rows.map((r) => r.id),
                                })}
                                disabled={addInstallmentMutation.isPending}
                                title="Add installment"
                                className="w-5 h-5 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm leading-none"
                              >
                                +
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* ── Installment Rows ── */}
                        {group.rows.map((item, ri) => (
                          <SortableRow
                            key={item.id}
                            item={item}
                            installmentIdx={group.rows.length > 1 ? ri + 1 : 0}
                            installmentTotal={group.rows.length}
                            onDelete={deleteLine}
                            onChange={handleLineChange}
                          />
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* 5. Quote Summary */}
        <QuoteSummary items={activeLines} />

        {/* 6. Quote Ref */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Quote Info</h3>
          <div className="flex justify-between text-gray-500">
            <span>Quote Ref</span>
            <span className="font-mono text-gray-700 text-xs">
              {quote.quoteRefNumber ?? "—"}
            </span>
          </div>
          {quote.leadId && quote.lead && (
            <div className="rounded-lg border p-3 space-y-2 mt-1" style={{ borderColor: "#F5821F", background: "#FEF0E3" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#A8603A" }}>Linked Lead</p>
                <button
                  onClick={() => navigate(`/admin/crm/leads/${quote.leadId}`)}
                  className="flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                  style={{ color: PRIMARY }}
                >
                  <ExternalLink size={11} /> View Lead
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Ref</span>
                <span className="font-mono text-gray-700">{quote.lead.leadRefNumber ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-800 font-medium">
                  {quote.lead.firstName && quote.lead.lastName
                    ? `${quote.lead.firstName} ${quote.lead.lastName.toUpperCase()}`
                    : (quote.lead.fullName ?? "—")}
                </span>
              </div>
              {quote.lead.status && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className="capitalize px-1.5 py-0.5 rounded-full bg-white border text-gray-600" style={{ borderColor: "#F5821F33" }}>
                    {quote.lead.status.replace(/_/g, " ")}
                  </span>
                </div>
              )}
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

      {/* ── Send Email Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Quote by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-xs text-gray-500">To</Label>
              <Input
                className="h-8 text-sm mt-1"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Subject</Label>
              <Input
                className="h-8 text-sm mt-1"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Message (optional)</Label>
              <Textarea
                className="text-sm mt-1 resize-none"
                rows={3}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Add a personal message…"
              />
            </div>
            <p className="text-xs text-gray-400">
              The quote summary and itemised product table will be included automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!emailTo.trim() || sendEmailMutation.isPending}
              onClick={() => sendEmailMutation.mutate()}
              style={{ backgroundColor: PRIMARY }}
              className="text-white hover:opacity-90 gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              {sendEmailMutation.isPending ? "Sending…" : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
