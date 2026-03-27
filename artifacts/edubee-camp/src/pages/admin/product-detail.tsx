import {
  useState, useEffect, useRef,
} from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ProductImageGallery, type ProductImage } from "@/components/ui/product-image-gallery";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft, Save, X, Search, Copy, Check, Loader2,
  Package, ExternalLink, Plus,
} from "lucide-react";
import { format } from "date-fns";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CURRENCIES = ["AUD", "USD", "NZD", "GBP", "EUR", "SGD", "CAD"];
const NONE = "__none__";

const INSTALLMENTS = [
  { value: NONE, label: "— None —" },
  { value: "Weekly", label: "Weekly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Half Yearly", label: "Half Yearly" },
  { value: "Annually", label: "Annually" },
];
const PAYMENT_TERMS = [
  { value: NONE, label: "— None —" },
  { value: "Once", label: "Once" },
  { value: "Multiple Times", label: "Multiple Times" },
];
const PRIORITIES = [
  { value: NONE, label: "— None —" },
  { value: "1", label: "Low" },
  { value: "2", label: "Normal" },
  { value: "3", label: "High" },
  { value: "4", label: "Featured" },
];
const GRADES = [
  { value: NONE, label: "— None —" },
  { value: "Beginner", label: "Beginner" },
  { value: "Elementary", label: "Elementary" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Upper-Intermediate", label: "Upper-Intermediate" },
  { value: "Advanced", label: "Advanced" },
  { value: "Professional", label: "Professional" },
  { value: "All Levels", label: "All Levels" },
];
const PRODUCT_CONTEXTS = [
  { value: "general",      label: "General" },
  { value: "camp_package", label: "Camp Package" },
  { value: "camp_addon",   label: "Camp Addon" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getAuthHeaders() {
  const t = localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken") ?? "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function api(path: string) {
  return axios.get(`${BASE}${path}`, { headers: getAuthHeaders() });
}

// ─── FieldLabel ────────────────────────────────────────────────────────────────
function FL({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5"
      style={{ color: "var(--e-text-2)" }}>
      {children}
    </label>
  );
}

// ─── TextInput ─────────────────────────────────────────────────────────────────
function TextInput({
  value, onChange, placeholder, type = "text", prefix, suffix, readOnly,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; prefix?: string; suffix?: string; readOnly?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-sm text-[#57534E] pointer-events-none select-none">{prefix}</span>
      )}
      <input
        type={type}
        readOnly={readOnly}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-10 border rounded-lg text-sm transition-colors
          focus:outline-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]
          disabled:opacity-60 disabled:cursor-not-allowed
          ${readOnly ? "cursor-default opacity-75" : ""}
          ${prefix ? "pl-8" : "px-3"} ${suffix ? "pr-10" : "pr-3"}`}
        style={{
          background: "var(--e-bg-surface)",
          borderColor: "var(--e-border)",
          color: readOnly ? "var(--e-text-2)" : "var(--e-text-1)",
        }}
      />
      {suffix && (
        <span className="absolute right-3 text-sm text-[#57534E] pointer-events-none select-none">{suffix}</span>
      )}
    </div>
  );
}

// ─── SelectField ───────────────────────────────────────────────────────────────
function SelectField({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const currentVal = (value === "" || value == null) ? NONE : value;
  const handleChange = (v: string) => onChange(v === NONE ? "" : v);
  return (
    <Select value={currentVal} onValueChange={handleChange}>
      <SelectTrigger className="h-10 border-[#E8E6E2] text-sm focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── RadioYesNo ────────────────────────────────────────────────────────────────
function RadioYesNo({
  value, onChange,
}: {
  value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-5 h-10">
      {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map(({ v, l }) => (
        <label key={String(v)} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={value === v}
            onChange={() => onChange(v)}
            className="w-4 h-4 accent-[#F5821F]"
          />
          <span className="text-sm" style={{ color: "var(--e-text-1)" }}>{l}</span>
        </label>
      ))}
    </div>
  );
}

// ─── ToggleSwitch ──────────────────────────────────────────────────────────────
function ToggleSwitch({
  value, onChange, label, helperText,
}: {
  value: boolean; onChange: (v: boolean) => void; label: string; helperText?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <FL>{label}</FL>
        {helperText && <p className="text-xs text-[#A8A29E] mt-0.5">{helperText}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none
          ${value ? "bg-[#F5821F]" : "bg-[#E8E6E2] dark:bg-[#3A3835]"}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md
            transform transition duration-200 ease-in-out
            ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

// ─── SearchSelect (pre-loaded, in-memory filter) ───────────────────────────────
interface SelectOption { id: string; name: string; sub?: string }

function SearchSelect({
  value, onChange, options, placeholder, loading = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  loading?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);

  const filtered = q
    ? options.filter(o => o.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40)
    : options.slice(0, 40);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center h-10 border border-[#F5821F] rounded-lg px-3 gap-2"
        style={{ background: "var(--e-bg-surface)" }}>
        <span className="flex-1 text-sm truncate" style={{ color: "var(--e-text-1)" }}>{selected.name}</span>
        {selected.sub && (
          <span className="text-xs shrink-0" style={{ color: "var(--e-text-3)" }}>{selected.sub}</span>
        )}
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 hover:text-[#DC2626] transition-colors"
          style={{ color: "var(--e-text-3)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--e-text-3)" }} />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "var(--e-text-3)" }} />
        ) : null}
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Loading…" : (placeholder ?? "Search…")}
          className="w-full h-10 pl-9 pr-3 border rounded-lg text-sm focus:outline-none focus:border-[#F5821F]
            focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]"
          style={{ background: "var(--e-bg-surface)", borderColor: "var(--e-border)", color: "var(--e-text-1)" }}
        />
      </div>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm" style={{ color: "var(--e-text-3)" }}>No results found</p>
          ) : (
            filtered.map(o => (
              <button
                key={o.id}
                type="button"
                onMouseDown={() => { onChange(o.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                style={{ color: "var(--e-text-1)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--e-bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}
              >
                <span className="text-sm truncate">{o.name}</span>
                {o.sub && <span className="text-xs shrink-0" style={{ color: "var(--e-text-3)" }}>{o.sub}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({ title, children, description }: {
  title: string; children: React.ReactNode; description?: string;
}) {
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] mb-6"
      style={{ background: "var(--e-bg-surface)", border: "1px solid var(--e-border)" }}>
      <div className="px-5 py-3 rounded-t-xl" style={{ borderBottom: "1px solid var(--e-border)", background: "var(--e-bg-page)" }}>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--e-text-2)" }}>{title}</h3>
      </div>
      {description && (
        <p className="px-5 pt-3 text-xs" style={{ color: "var(--e-text-2)" }}>{description}</p>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
function Btn({
  onClick, disabled, loading, children, variant = "primary", size = "md",
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  size?: "sm" | "md";
}) {
  const base = "inline-flex items-center gap-1.5 font-semibold rounded-lg transition-all focus:outline-none";
  const sizes = size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-5 text-sm";
  const variants = {
    primary: "bg-[#F5821F] text-white hover:bg-[#D96A0A] disabled:opacity-60 disabled:cursor-not-allowed",
    outline: "border disabled:opacity-60 hover:opacity-80",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes} ${variants[variant]}`}
      style={variant === "outline" ? { background: "var(--e-bg-surface)", color: "var(--e-text-1)", borderColor: "var(--e-border)" } : undefined}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canEdit = ["super_admin", "admin"].includes(user?.role ?? "");

  const [form, setForm] = useState<Record<string, any>>({
    productName: "", fromDate: "", toDate: "", durationWeeks: "",
    productTypeId: "", currency: "AUD", isGstIncluded: false,
    displayOnQuote: true, displayOnInvoice: true,
    isRecommend: false, status: "active", productContext: "general",
  });
  const [originalForm, setOriginalForm] = useState<Record<string, any>>({});
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [copiedId, setCopiedId] = useState(false);
  const [showPkgLinker, setShowPkgLinker] = useState(false);
  const [pkgLinkSearch, setPkgLinkSearch] = useState("");
  const [selectedPkgToLink, setSelectedPkgToLink] = useState<string | null>(null);
  const [pkgLinkQty, setPkgLinkQty] = useState(1);
  const [pkgLinkIsOptional, setPkgLinkIsOptional] = useState(false);
  const [pkgLinkUnitPrice, setPkgLinkUnitPrice] = useState("");
  const [pkgLinkError, setPkgLinkError] = useState<string | null>(null);
  const [pkgRepSearch, setPkgRepSearch] = useState("");
  const [showPkgRepDropdown, setShowPkgRepDropdown] = useState(false);
  const [topBarVisible, setTopBarVisible] = useState(true);
  const topBarRef = useRef<HTMLDivElement>(null);

  const sf = (k: string) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  // ── IntersectionObserver for sticky bar ───────────────────────────────────
  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setTopBarVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: rec, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: () => api(`/api/products/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  const { data: linkedPackagesData = [] } = useQuery({
    queryKey: ["product-linked-packages", id],
    queryFn: () => api(`/api/products/${id}/linked-packages`).then(r => r.data),
    enabled: !isNew,
  });
  const linkedPackages: any[] = Array.isArray(linkedPackagesData) ? linkedPackagesData : [];

  const { data: pkgSearchRaw } = useQuery({
    queryKey: ["pkg-search-for-product", pkgLinkSearch],
    queryFn: () => api(`/api/packages?search=${encodeURIComponent(pkgLinkSearch)}&status=active&limit=30`).then(r => r.data),
    enabled: showPkgLinker,
    staleTime: 10000,
  });
  const pkgSearchResults: any[] = Array.isArray((pkgSearchRaw as any)?.data) ? (pkgSearchRaw as any).data : [];

  // ── Package-as-Product: search when productContext = "camp_package"
  const { data: pkgRepSearchRaw } = useQuery({
    queryKey: ["pkg-rep-search", pkgRepSearch],
    queryFn: () => api(`/api/packages?search=${encodeURIComponent(pkgRepSearch)}&status=active&limit=20`).then(r => r.data),
    enabled: form["productContext"] === "camp_package",
    staleTime: 10000,
  });
  const pkgRepResults: any[] = Array.isArray((pkgRepSearchRaw as any)?.data) ? (pkgRepSearchRaw as any).data : [];

  // ── Lookup linked package name from campPackageId ──────────────────────────
  const { data: linkedPkgRep } = useQuery({
    queryKey: ["pkg-rep-lookup", form["campPackageId"]],
    queryFn: () => api(`/api/packages/${form["campPackageId"]}`).then(r => r.data),
    enabled: !!(form["campPackageId"]) && !isNew,
    staleTime: 30000,
  });

  const { data: productGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["lookup-product-groups"],
    queryFn: () => api(`/api/product-groups`).then(r => r.data),
    staleTime: 60000,
  });

  const { data: allProductTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["lookup-all-product-types"],
    queryFn: () => api(`/api/product-types`).then(r => r.data),
    staleTime: 60000,
  });

  const { data: accountOpts = [], isLoading: acctLoading } = useQuery<SelectOption[]>({
    queryKey: ["lookup-accounts"],
    queryFn: () => api(`/api/products-lookup/accounts`).then(r => r.data),
    staleTime: 60000,
  });

  const { data: commissionOpts = [], isLoading: commLoading } = useQuery({
    queryKey: ["lookup-commissions-detail"],
    queryFn: () => api(`/api/products-lookup/commissions-detail`).then(r => r.data),
    staleTime: 60000,
  });

  const { data: promotionOpts = [], isLoading: promoLoading } = useQuery({
    queryKey: ["lookup-promotions-detail"],
    queryFn: () => api(`/api/products-lookup/promotions-detail`).then(r => r.data),
    staleTime: 60000,
  });

  const { data: taxRateOpts = [], isLoading: taxLoading } = useQuery({
    queryKey: ["lookup-tax-rates"],
    queryFn: () => api(`/api/products-lookup/tax-rates`).then(r => r.data),
    staleTime: 60000,
  });

  // ── Derived: selected provider for country/city display ───────────────────
  const selectedProvider    = (accountOpts as any[]).find((a: any) => a.id === (form["providerId"] ?? "")) ?? null;
  const providerCountry:  string = selectedProvider?.country   ?? (form["providerCountry"]  as string) ?? "";
  const providerLocation: string = selectedProvider?.location  ?? (form["providerLocation"] as string) ?? "";

  // ── Derived: product types filtered by selected group ─────────────────────
  const filteredTypes: SelectOption[] = selectedGroupId
    ? allProductTypes
        .filter((t: any) => t.productGroupId === selectedGroupId)
        .map((t: any) => ({ id: t.id, name: t.name, sub: t.productGroupName }))
    : allProductTypes.map((t: any) => ({ id: t.id, name: t.name, sub: t.productGroupName }));

  // ── Derived: serviceModuleType inherited from selected product type ────────
  const selectedProductType = allProductTypes.find((t: any) => t.id === form["productTypeId"]);
  const inheritedServiceModule: string = (selectedProductType as any)?.serviceModuleType ?? "";

  const groupSelectOpts: SelectOption[] = productGroups.map((g: any) => ({ id: g.id, name: g.name }));

  const commSelectOpts: SelectOption[] = commissionOpts.map((c: any) => ({
    id: c.id,
    name: c.name,
    sub: c.commissionType === "rate" ? `${c.rateValue ?? 0}%` : `$${c.rateValue ?? 0}`,
  }));

  const promoSelectOpts: SelectOption[] = promotionOpts.map((p: any) => ({
    id: p.id,
    name: p.name,
    sub: p.fromDate && p.toDate
      ? `${p.fromDate} → ${p.toDate}`
      : undefined,
  }));

  const taxSelectOpts: SelectOption[] = taxRateOpts.map((t: any) => ({
    id: t.id,
    name: t.name,
    sub: `${t.rate ?? 0}%`,
  }));

  // ── Init form when data loads ─────────────────────────────────────────────
  useEffect(() => {
    if (rec) {
      const init = { ...rec };
      setForm(init);
      setOriginalForm(init);
    }
  }, [rec]);

  useEffect(() => {
    if (rec?.productTypeId && allProductTypes.length > 0) {
      const found = allProductTypes.find((t: any) => t.id === rec.productTypeId);
      if (found?.productGroupId) setSelectedGroupId(found.productGroupId);
    }
  }, [rec, allProductTypes]);

  // ── Auto-sync serviceModuleType from selected product type ────────────────
  useEffect(() => {
    if (!form["productTypeId"] || allProductTypes.length === 0) return;
    const found = allProductTypes.find((t: any) => t.id === form["productTypeId"]) as any;
    if (found?.serviceModuleType) {
      setForm(f => ({ ...f, serviceModuleType: found.serviceModuleType }));
    }
  }, [form["productTypeId"], allProductTypes]);

  // ── Duration auto-calc ────────────────────────────────────────────────────
  useEffect(() => {
    const from = form.fromDate;
    const to = form.toDate;
    if (from && to) {
      const diff = new Date(to).getTime() - new Date(from).getTime();
      if (diff > 0) {
        const weeks = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
        setForm(f => ({ ...f, durationWeeks: weeks }));
      }
    }
  }, [form.fromDate, form.toDate]);

  // ── Dirty state ───────────────────────────────────────────────────────────
  const isDirty = JSON.stringify(form) !== JSON.stringify(originalForm);

  // ── Save mutations ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      // ── Required field validation (hard block for new products only) ──────
      if (isNew) {
        if (!selectedGroupId) {
          toast({ title: "Product Group is required", className: "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]" });
          return Promise.reject(new Error("validation"));
        }
        if (!form["productTypeId"]) {
          toast({ title: "Product Type is required", className: "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]" });
          return Promise.reject(new Error("validation"));
        }
        const smt = form["serviceModuleType"] || inheritedServiceModule;
        if (!smt) {
          toast({ title: "Service Module is required — ensure the selected Product Type has a Service Module assigned", className: "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]" });
          return Promise.reject(new Error("validation"));
        }
      }
      const { id: _id, createdAt: _ca, updatedAt: _ua, convertedCost: _cc, ...body } = form;
      // Ensure serviceModuleType is set from the product type if not already set
      if (!body.serviceModuleType && inheritedServiceModule) body.serviceModuleType = inheritedServiceModule;
      if (isNew) {
        return axios.post(`${BASE}/api/products`, body, { headers: getAuthHeaders() }).then(r => r.data);
      }
      return axios.put(`${BASE}/api/products/${id}`, body, { headers: getAuthHeaders() }).then(r => r.data);
    },
    onSuccess: async (saved) => {
      const savedId = saved.id ?? id;
      qc.invalidateQueries({ queryKey: ["product-detail", id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setOriginalForm(form);
      toast({
        title: "Product saved successfully",
        className: "border-[#16A34A] bg-[#DCFCE7] text-[#16A34A]",
      });
      if (isNew) navigate(`${BASE}/admin/products/${savedId}`);
    },
    onError: (err: any) => {
      if (err?.message === "validation") return;
      const msg = err?.response?.data?.error ?? err.message ?? "Unknown error";
      toast({
        title: `Failed to save product: ${msg}`,
        className: "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]",
      });
    },
  });

  const linkToPackage = useMutation({
    mutationFn: (pkgId: string) =>
      axios.post(
        `${BASE}/api/packages/${pkgId}/products`,
        { productId: id, isOptional: pkgLinkIsOptional, quantity: pkgLinkQty, unitPrice: pkgLinkUnitPrice || null },
        { headers: getAuthHeaders() }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-linked-packages", id] });
      setShowPkgLinker(false);
      setPkgLinkSearch("");
      setSelectedPkgToLink(null);
      setPkgLinkQty(1);
      setPkgLinkIsOptional(false);
      setPkgLinkUnitPrice("");
      setPkgLinkError(null);
    },
    onError: (e: any) => setPkgLinkError(e?.response?.data?.error ?? "Failed to link"),
  });

  const unlinkFromPackage = useMutation({
    mutationFn: ({ packageId, productId: pid }: { packageId: string; productId: string }) =>
      axios.delete(`${BASE}/api/packages/${packageId}/products/${pid}`, { headers: getAuthHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-linked-packages", id] }),
  });

  const handleCancel = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) return;
    }
    navigate(`${BASE}/admin/products`);
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setForm(f => ({ ...f, productTypeId: "" }));
  };

  const copyId = () => {
    if (rec?.id) {
      navigator.clipboard.writeText(rec.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isNew && isLoading) {
    return (
      <div className="max-w-[960px] mx-auto px-6 py-8 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }
  if (!isNew && !rec) {
    return <div className="p-8 text-[#57534E]">Product not found.</div>;
  }

  const g = (k: string, fallback: any = "") => form[k] ?? fallback;
  const gb = (k: string, fallback = false): boolean => Boolean(form[k] ?? fallback);

  const topBarBtns = (
    <>
      <Btn variant="outline" onClick={handleCancel}>
        <X className="w-3.5 h-3.5" /> Cancel
      </Btn>
      {canEdit && (
        <Btn
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={saveMutation.isPending}
        >
          <Save className="w-3.5 h-3.5" />
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Btn>
      )}
    </>
  );

  const nameForBreadcrumb = isNew ? "New Product" : (rec?.productName ?? "Product");

  return (
    <div className="min-h-screen" style={{ background: "var(--e-bg-page)" }}>
      <div className="max-w-[960px] mx-auto px-6 py-8 pb-32">

        {/* ── Top Bar ── */}
        <div ref={topBarRef} className="flex items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--e-text-2)" }}>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 hover:text-[#F5821F] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Products
            </button>
            <span style={{ color: "var(--e-border)" }}>/</span>
            <span className="font-semibold truncate max-w-[280px]" style={{ color: "var(--e-text-1)" }}>
              {nameForBreadcrumb}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {topBarBtns}
          </div>
        </div>

        {/* ── Two-Column Grid ── */}
        <div className="grid gap-6" style={{ gridTemplateColumns: "2fr 1fr" }}>

          {/* ════ LEFT COLUMN ════ */}
          <div>

            {/* [1] GENERAL */}
            <Section title="General">
              <div className="space-y-4">
                <div>
                  <FL>Product Name *</FL>
                  <TextInput
                    value={g("productName")}
                    onChange={sf("productName")}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Country</FL>
                    <div className={`w-full px-3 py-2 rounded-lg border text-sm bg-muted/40 text-foreground border-border cursor-default min-h-[38px] flex items-center`}>
                      {providerCountry
                        ? <span className="flex items-center gap-1.5">{providerCountry}</span>
                        : <span className="text-muted-foreground/60">—</span>
                      }
                    </div>
                  </div>
                  <div>
                    <FL>Location</FL>
                    <div className={`w-full px-3 py-2 rounded-lg border text-sm bg-muted/40 text-foreground border-border cursor-default min-h-[38px] flex items-center`}>
                      {providerLocation
                        ? <span>{providerLocation}</span>
                        : <span className="text-muted-foreground/60">—</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <FL>From Date</FL>
                    <TextInput type="date" value={g("fromDate")} onChange={sf("fromDate")} />
                  </div>
                  <div>
                    <FL>To Date</FL>
                    <TextInput type="date" value={g("toDate")} onChange={sf("toDate")} />
                  </div>
                  <div>
                    <FL>Duration (Weeks)</FL>
                    <TextInput
                      type="number"
                      value={String(g("durationWeeks") ?? "")}
                      onChange={v => sf("durationWeeks")(v ? Number(v) : "")}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* [2] CLASSIFICATION */}
            <Section title="Classification">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Product Group <span className="text-red-500">*</span></FL>
                    <SearchSelect
                      value={selectedGroupId}
                      onChange={handleGroupChange}
                      options={groupSelectOpts}
                      placeholder="Search product groups…"
                      loading={groupsLoading}
                    />
                  </div>
                  <div>
                    <FL>Product Type <span className="text-red-500">*</span></FL>
                    <SearchSelect
                      value={g("productTypeId")}
                      onChange={sf("productTypeId")}
                      options={filteredTypes}
                      placeholder={selectedGroupId ? "Search product types…" : "Select a Product Group first"}
                      loading={typesLoading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Service Module <span className="text-red-500">*</span></FL>
                    <div className={`w-full px-3 py-2 rounded-lg border text-sm min-h-[38px] flex items-center gap-2 ${inheritedServiceModule ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-muted/40 border-border text-muted-foreground/60"}`}>
                      {inheritedServiceModule
                        ? <><span className="w-2 h-2 rounded-full bg-orange-400 inline-block shrink-0" />{inheritedServiceModule}</>
                        : <span className="italic">Auto-filled from Product Type</span>
                      }
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Product Priority</FL>
                    <SelectField
                      value={String(g("productPriority") ?? "")}
                      onChange={v => sf("productPriority")(v ? Number(v) : null)}
                      options={PRIORITIES}
                    />
                  </div>
                  <div>
                    <FL>Product Grade</FL>
                    <SelectField
                      value={g("productGrade")}
                      onChange={sf("productGrade")}
                      options={GRADES}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Recommend</FL>
                    <RadioYesNo value={gb("isRecommend")} onChange={sf("isRecommend")} />
                  </div>
                  <div>
                    <FL>Status</FL>
                    <SelectField
                      value={g("status") || "active"}
                      onChange={sf("status")}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                        { value: "archived", label: "Archived" },
                      ]}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Product Context</FL>
                    <SelectField
                      value={g("productContext") || "general"}
                      onChange={(v: any) => {
                        sf("productContext")(v);
                        if (v !== "camp_package") sf("campPackageId")(null);
                      }}
                      options={PRODUCT_CONTEXTS}
                    />
                  </div>
                  {g("productContext") === "camp_package" && (
                    <div className="relative">
                      <FL>Represents Package</FL>
                      {g("campPackageId") ? (
                        <div className="flex items-center gap-2 px-3 py-2 border border-[#E7E5E4] rounded-md bg-[#FEF0E3]">
                          <span className="flex-1 text-sm text-[#1C1917] truncate">
                            {(linkedPkgRep as any)?.packageName ?? (linkedPkgRep as any)?.name ?? g("campPackageId")}
                          </span>
                          <button
                            type="button"
                            onClick={() => { sf("campPackageId")(null); setPkgRepSearch(""); setShowPkgRepDropdown(false); }}
                            className="text-[#A8A29E] hover:text-[#F97316] text-xs font-bold flex-shrink-0"
                          >✕</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            className="w-full border border-[#E7E5E4] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                            placeholder="Search packages…"
                            value={pkgRepSearch}
                            onChange={e => { setPkgRepSearch(e.target.value); setShowPkgRepDropdown(true); }}
                            onFocus={() => setShowPkgRepDropdown(true)}
                            onBlur={() => setTimeout(() => setShowPkgRepDropdown(false), 200)}
                          />
                          {showPkgRepDropdown && pkgRepResults.length > 0 && (
                            <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-[#E7E5E4] rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {pkgRepResults.map((pkg: any) => (
                                <div
                                  key={pkg.id}
                                  className="px-3 py-2 text-sm hover:bg-[#FEF0E3] cursor-pointer transition-colors text-[#1C1917]"
                                  onMouseDown={() => {
                                    sf("campPackageId")(pkg.id);
                                    setPkgRepSearch("");
                                    setShowPkgRepDropdown(false);
                                  }}
                                >
                                  <span className="font-medium">{pkg.packageName ?? pkg.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-[#A8A29E] mt-1">The package whose items will be expanded when converting to contract</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* [3] COMMISSION STRUCTURE */}
            <Section title="Commission Structure">
              <div className="space-y-4">
                <div>
                  <FL>Product Provider (Institute) *</FL>
                  <SearchSelect
                    value={g("providerId")}
                    onChange={sf("providerId")}
                    options={accountOpts}
                    placeholder="Search accounts…"
                    loading={acctLoading}
                  />
                  <p className="text-xs text-[#A8A29E] mt-1">
                    The institute or organization that provides this product
                  </p>
                </div>
                <div>
                  <FL>Commission *</FL>
                  <SearchSelect
                    value={g("commissionId")}
                    onChange={sf("commissionId")}
                    options={commSelectOpts}
                    placeholder="Search commissions…"
                    loading={commLoading}
                  />
                  <p className="text-xs text-[#A8A29E] mt-1">
                    Commission rate received from the institute for this product
                  </p>
                </div>
              </div>
            </Section>

            {/* [4] PROMOTION */}
            <Section title="Promotion">
              <div>
                <FL>Promotion</FL>
                <SearchSelect
                  value={g("promotionId")}
                  onChange={sf("promotionId")}
                  options={promoSelectOpts}
                  placeholder="Search promotions…"
                  loading={promoLoading}
                />
                <p className="text-xs text-[#A8A29E] mt-1">
                  Apply a time-limited promotion to this product
                </p>
              </div>
            </Section>

            {/* [5] PAYMENT SETTINGS */}
            <Section title="Payment Settings">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Installment Plan</FL>
                    <SelectField
                      value={g("installmentPlan")}
                      onChange={sf("installmentPlan")}
                      options={INSTALLMENTS}
                    />
                  </div>
                  <div>
                    <FL>Default Payment Term</FL>
                    <SelectField
                      value={g("defaultPaymentTerm")}
                      onChange={sf("defaultPaymentTerm")}
                      options={PAYMENT_TERMS}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Number of Payments</FL>
                    <TextInput
                      type="number"
                      value={String(g("numberOfPayments") ?? "")}
                      onChange={v => sf("numberOfPayments")(v ? Number(v) : null)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <FL>Minimum Payment</FL>
                    <TextInput
                      type="number"
                      value={String(g("minimumPayment") ?? "")}
                      onChange={sf("minimumPayment")}
                      placeholder="0.00"
                      prefix="$"
                    />
                  </div>
                </div>
                {(() => {
                  const nop = Number(form.numberOfPayments ?? 0);
                  const mp  = Number(form.minimumPayment ?? 0);
                  const price = Number(form.price ?? 0);
                  if (nop > 0 && mp > 0 && price > 0 && nop * mp > price) {
                    return (
                      <p className="text-xs text-[#CA8A04] bg-[#FEF9C3] rounded-lg px-3 py-2">
                        ⚠️ Number of payments × minimum payment cannot exceed the product price
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </Section>

            {/* [10] DESCRIPTION & NOTES */}
            <Section title="Description & Notes">
              <div>
                <FL>Product Description</FL>
                <p className="text-xs mb-2" style={{ color: "var(--e-text-3)" }}>
                  Rich text description shown to external customers on the website or catalog.
                  Supports headings, lists, bold/italic, links, and more.
                </p>
                <RichTextEditor
                  value={g("description")}
                  onChange={sf("description")}
                  placeholder="Write a detailed product description for customers…"
                  minHeight={220}
                />
              </div>
            </Section>

          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div>

            {/* [6] PRICING & TAX */}
            <Section title="Pricing & Tax">
              <div className="space-y-4">
                <div>
                  <FL>Item Description</FL>
                  <Textarea
                    rows={3}
                    value={g("itemDescription")}
                    onChange={e => sf("itemDescription")(e.target.value)}
                    placeholder="Brief description shown on quote/invoice line item"
                    className="border-[#E8E6E2] text-sm resize-none focus:border-[#F5821F] focus:shadow-[0_0_0_3px_rgba(245,130,31,0.15)]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FL>Price</FL>
                    <TextInput
                      type="number"
                      value={String(g("price") ?? "")}
                      onChange={sf("price")}
                      placeholder="0.00"
                      prefix="$"
                    />
                  </div>
                  <div>
                    <FL>Currency</FL>
                    <SelectField
                      value={g("currency") || "AUD"}
                      onChange={sf("currency")}
                      options={CURRENCIES.map(c => ({ value: c, label: c }))}
                    />
                  </div>
                </div>
                <div>
                  <FL>Unit</FL>
                  <SelectField
                    value={g("unit") || ""}
                    onChange={sf("unit")}
                    options={[
                      { value: NONE, label: "— No unit —" },
                      ...["per person","per night","per day","per session","per trip","per group","per week","per transfer","per meal","per semester","per annual","per course","flat fee"]
                        .map(u => ({ value: u, label: u }))
                    ]}
                  />
                </div>
                <div>
                  <FL>GST Included</FL>
                  <RadioYesNo value={gb("isGstIncluded")} onChange={sf("isGstIncluded")} />
                </div>
                <div>
                  <FL>Tax Rate</FL>
                  <SearchSelect
                    value={g("taxRateId")}
                    onChange={sf("taxRateId")}
                    options={taxSelectOpts}
                    placeholder="Search tax rates…"
                    loading={taxLoading}
                  />
                </div>
              </div>
            </Section>

            {/* [7] DISPLAY & SETUP */}
            <Section title="Display & Setup">
              <div className="space-y-4">
                <ToggleSwitch
                  value={gb("displayOnQuote", true)}
                  onChange={sf("displayOnQuote")}
                  label="Display on Quote"
                  helperText="Show this product line on the Quote PDF"
                />
                <ToggleSwitch
                  value={gb("displayOnInvoice", true)}
                  onChange={sf("displayOnInvoice")}
                  label="Display on Invoice"
                  helperText="Show this product line on the Invoice PDF"
                />
              </div>
            </Section>

            {/* [8b] LINKED PACKAGES */}
            {!isNew && (
              <Section title="Linked Packages">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#57534E]">
                      Packages that include this product as an item.
                    </p>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setPkgLinkSearch("");
                          setSelectedPkgToLink(null);
                          setPkgLinkQty(1);
                          setPkgLinkIsOptional(false);
                          setPkgLinkUnitPrice("");
                          setPkgLinkError(null);
                          setShowPkgLinker(v => !v);
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: "rgba(245,130,31,0.35)", color: "var(--e-orange)", background: showPkgLinker ? "var(--e-orange-lt)" : "transparent" }}
                      >
                        <Plus className="w-3 h-3" /> Add to Package
                      </button>
                    )}
                  </div>

                  {/* Package picker */}
                  {showPkgLinker && (
                    <div className="border rounded-lg p-3 space-y-2.5" style={{ borderColor: "rgba(245,130,31,0.3)", background: "var(--e-orange-lt)" }}>
                      {/* Search input */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search packages…"
                          value={pkgLinkSearch}
                          onChange={e => { setPkgLinkSearch(e.target.value); setSelectedPkgToLink(null); }}
                          className="w-full pl-8 pr-3 h-8 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                        />
                      </div>
                      {/* Package list */}
                      <div className="max-h-40 overflow-y-auto border rounded-md divide-y bg-white">
                        {pkgSearchResults
                          .filter((p: any) => !linkedPackages.some((l: any) => l.packageId === p.id))
                          .map((p: any) => (
                            <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40">
                              <input
                                type="radio"
                                name="pkg-link-sel"
                                value={p.id}
                                checked={selectedPkgToLink === p.id}
                                onChange={() => setSelectedPkgToLink(p.id)}
                                className="shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium block truncate">{p.name}</span>
                                <span className="text-[11px] text-muted-foreground">{p.groupNameEn ?? ""}</span>
                              </div>
                            </label>
                          ))}
                        {pkgSearchResults.filter((p: any) => !linkedPackages.some((l: any) => l.packageId === p.id)).length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-2 italic">
                            {pkgLinkSearch ? "No packages found" : "Type to search packages"}
                          </p>
                        )}
                      </div>
                      {/* Options row */}
                      {selectedPkgToLink && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[11px] font-semibold mb-0.5 text-muted-foreground">Qty</p>
                            <input
                              type="number"
                              min={1}
                              value={pkgLinkQty}
                              onChange={e => setPkgLinkQty(Number(e.target.value))}
                              className="w-full h-7 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold mb-0.5 text-muted-foreground">Unit Price</p>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="—"
                              value={pkgLinkUnitPrice}
                              onChange={e => setPkgLinkUnitPrice(e.target.value)}
                              className="w-full h-7 px-2 text-xs border rounded-md bg-white font-mono focus:outline-none focus:ring-1 focus:ring-[#F5821F]"
                            />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold mb-0.5 text-muted-foreground">Inclusion</p>
                            <Select value={pkgLinkIsOptional ? "optional" : "included"} onValueChange={v => setPkgLinkIsOptional(v === "optional")}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="included">Included</SelectItem>
                                <SelectItem value="optional">Optional</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      {pkgLinkError && <p className="text-xs text-red-500">{pkgLinkError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={!selectedPkgToLink || linkToPackage.isPending}
                          onClick={() => selectedPkgToLink && linkToPackage.mutate(selectedPkgToLink)}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                          style={{ background: "var(--e-orange)" }}
                        >
                          {linkToPackage.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPkgLinker(false)}
                          className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-muted/40"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Linked packages table */}
                  {linkedPackages.length === 0 ? (
                    <p className="text-xs text-[#A8A29E] py-1">This product is not linked to any packages yet.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30 border-b">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Package</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Program Group</th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inclusion</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                            <th className="w-16 px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {linkedPackages.map((row: any) => (
                            <tr key={row.linkId} className="border-b last:border-0 hover:bg-[#FEF0E3]/40 transition-colors">
                              <td className="px-3 py-2 font-medium text-sm">{row.packageName}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">
                                <div>{row.groupNameEn ?? "—"}</div>
                                {row.groupNameKo && <div className="text-[10px] text-muted-foreground/60">{row.groupNameKo}</div>}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${row.isOptional ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-700"}`}>
                                  {row.isOptional ? "Optional" : "Included"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs">{row.quantity ?? 1}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                  row.packageStatus === "active"   ? "bg-green-50 text-green-700" :
                                  row.packageStatus === "inactive" ? "bg-amber-50 text-amber-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>{row.packageStatus ?? "—"}</span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`${BASE}/admin/package-groups/${row.packageGroupId}`)}
                                    className="text-muted-foreground hover:text-[#F5821F] transition-colors"
                                    title="Open package group"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => { if (window.confirm("Remove this product from the package?")) unlinkFromPackage.mutate({ packageId: row.packageId, productId: id }); }}
                                      className="text-muted-foreground hover:text-red-500 transition-colors"
                                      title="Remove link"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* [9] PRODUCT IMAGES */}
            <Section title="Product Images">
              <ProductImageGallery
                images={Array.isArray(form.productImages) ? (form.productImages as ProductImage[]) : []}
                onChange={sf("productImages")}
                disabled={!canEdit}
              />
            </Section>

            {/* [10] ADMIN INFO */}
            {!isNew && rec && (
              <Section title="Admin Info">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FL>Created On</FL>
                      <p className="text-sm" style={{ color: "var(--e-text-1)" }}>
                        {rec.createdAt ? format(new Date(rec.createdAt), "PPP p") : "—"}
                      </p>
                    </div>
                    <div>
                      <FL>Modified On</FL>
                      <p className="text-sm" style={{ color: "var(--e-text-1)" }}>
                        {(rec.modifiedOn ?? rec.updatedAt)
                          ? format(new Date(rec.modifiedOn ?? rec.updatedAt), "PPP p")
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FL>Status</FL>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        rec.status === "active" ? "bg-[#DCFCE7] text-[#16A34A]" :
                        rec.status === "archived" ? "bg-[#FEF2F2] text-[#DC2626]" :
                        "bg-[#F4F3F1] text-[#57534E]"
                      }`}>{rec.status ?? "active"}</span>
                    </div>
                    <div>
                      <FL>Product ID</FL>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-mono truncate" style={{ color: "var(--e-text-3)" }}>{rec.id}</p>
                        <button
                          type="button"
                          onClick={copyId}
                          className="shrink-0 hover:text-[#F5821F] transition-colors"
                          style={{ color: "var(--e-text-3)" }}
                          title="Copy ID"
                        >
                          {copiedId ? (
                            <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      {!topBarVisible && canEdit && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-6 py-3
          flex items-center justify-end gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.10)]"
          style={{ background: "var(--e-bg-surface)", borderTop: "1px solid var(--e-border)" }}>
          <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--e-text-1)" }}>
            {nameForBreadcrumb}
          </span>
          {topBarBtns}
        </div>
      )}
    </div>
  );
}
