import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, RotateCcw } from "lucide-react";

export interface ProductSearchFilters {
  searchCategory: string;
  searchText: string;
  productGroup: string;
  productType: string;
  productPriority: string;
  productGrade: string;
  status: string;
  country: string;
  location: string;
}

interface ProductAdvancedSearchProps {
  onSearch: (filters: ProductSearchFilters) => void;
  options?: {
    searchCategories?: { value: string; label: string }[];
    productGroups?: { value: string; label: string }[];
    productTypes?: { value: string; label: string }[];
    countries?: { value: string; label: string }[];
    locations?: { value: string; label: string }[];
  };
}

const DEFAULT_SEARCH_CATEGORIES = [
  { value: "all",      label: "All Fields" },
  { value: "name",     label: "Product Name" },
  { value: "provider", label: "Provider (School)" },
];

const PRIORITIES = ["10","9","8","7","6","5"];
const GRADES     = ["A","B","C","D"];
const STATUSES   = ["active","inactive","archived"];

const S = {
  wrapper: {
    background: "#FFFFFF",
    border: "1px solid #E8E6E2",
    borderRadius: "12px",
    padding: "14px 18px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  } as React.CSSProperties,
  row: { display: "flex", alignItems: "center", gap: "10px" } as React.CSSProperties,
  select: {
    height: "38px", border: "1.5px solid #E8E6E2", borderRadius: "8px",
    padding: "0 32px 0 10px", fontSize: "14px", color: "#1C1917",
    background: "#FFFFFF", appearance: "none" as const, WebkitAppearance: "none" as const,
    cursor: "pointer", outline: "none", flexShrink: 0,
  } as React.CSSProperties,
  input: {
    height: "38px", border: "1.5px solid #E8E6E2", borderRadius: "8px",
    padding: "0 12px", fontSize: "14px", color: "#1C1917",
    background: "#FFFFFF", outline: "none", flex: 1,
  } as React.CSSProperties,
  btnPrimary: {
    height: "38px", padding: "0 18px", background: "#F5821F", color: "#FFFFFF",
    border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "14px",
    cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
    whiteSpace: "nowrap" as const, flexShrink: 0,
  } as React.CSSProperties,
  btnToggle: {
    height: "32px", padding: "0 10px", background: "transparent", color: "#57534E",
    border: "1.5px solid #E8E6E2", borderRadius: "8px", fontWeight: 500,
    fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center",
    gap: "5px", flexShrink: 0,
  } as React.CSSProperties,
  divider: { height: "1px", background: "#F4F3F1", margin: "12px 0" } as React.CSSProperties,
  label: {
    fontSize: "11px", fontWeight: 600, textTransform: "uppercase" as const,
    letterSpacing: "0.05em", color: "#A8A29E", marginBottom: "5px", display: "block",
  } as React.CSSProperties,
  fieldGroup: { display: "flex", flexDirection: "column" as const, flex: 1, minWidth: "130px" } as React.CSSProperties,
  selectWrap: { position: "relative" as const, display: "flex", flex: 1 } as React.CSSProperties,
  chevron: {
    position: "absolute" as const, right: "9px", top: "50%",
    transform: "translateY(-50%)", pointerEvents: "none" as const, color: "#A8A29E",
  } as React.CSSProperties,
};

function FocusSelect({ style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      style={style}
      {...props}
      onFocus={e => { e.currentTarget.style.borderColor = "#F5821F"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)"; }}
      onBlur={e =>  { e.currentTarget.style.borderColor = "#E8E6E2"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

function FocusInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={style}
      {...props}
      onFocus={e => { e.currentTarget.style.borderColor = "#F5821F"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)"; }}
      onBlur={e =>  { e.currentTarget.style.borderColor = "#E8E6E2"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

const empty: ProductSearchFilters = {
  searchCategory: "", searchText: "", productGroup: "",
  productType: "", productPriority: "", productGrade: "", status: "",
  country: "", location: "",
};

export function ProductAdvancedSearch({ onSearch, options = {} }: ProductAdvancedSearchProps) {
  const [open, setOpen]       = useState(false);
  const [filters, setFilters] = useState<ProductSearchFilters>(empty);
  const set = (k: keyof ProductSearchFilters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters(f => ({ ...f, [k]: e.target.value }));

  const activeCount = [
    filters.productGroup, filters.productType,
    filters.productPriority, filters.productGrade, filters.status,
    filters.country, filters.location,
  ].filter(Boolean).length;

  const reset = () => { setFilters(empty); onSearch(empty); };

  const searchCategories = options.searchCategories ?? DEFAULT_SEARCH_CATEGORIES;
  const productGroups    = options.productGroups ?? [];
  const productTypes     = options.productTypes  ?? [];
  const countries        = options.countries     ?? [];
  const locations        = options.locations      ?? [];

  return (
    <div style={S.wrapper}>
      {/* ── Row 1: Basic Search ── */}
      <div style={S.row}>
        {/* Category */}
        <div style={{ ...S.selectWrap, flex: "0 0 180px" }}>
          <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.searchCategory} onChange={set("searchCategory")}>
            {searchCategories.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FocusSelect>
          <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
        </div>

        {/* Text */}
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} strokeWidth={1.5} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#A8A29E", pointerEvents: "none" }} />
          <FocusInput
            style={{ ...S.input, paddingLeft: 34 }}
            placeholder="Search products…"
            value={filters.searchText}
            onChange={set("searchText")}
            onKeyDown={e => e.key === "Enter" && onSearch(filters)}
          />
        </div>

        {/* Search */}
        <button style={S.btnPrimary}
          onClick={() => onSearch(filters)}
          onMouseEnter={e => { e.currentTarget.style.background = "#D96A0A"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#F5821F"; }}>
          <Search size={14} strokeWidth={2} /> Search
        </button>

        {/* Advanced Toggle */}
        <button
          style={{ ...S.btnToggle, ...(open ? { background: "#FEF0E3", color: "#F5821F", borderColor: "#F5821F" } : {}) }}
          onClick={() => setOpen(v => !v)}>
          <SlidersHorizontal size={13} strokeWidth={1.5} />
          Advanced
          {activeCount > 0 && (
            <span style={{ background: "#F5821F", color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "1px 6px" }}>
              {activeCount}
            </span>
          )}
          <ChevronDown size={12} strokeWidth={2} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
        </button>
      </div>

      {/* ── Advanced Panel ── */}
      {open && (
        <>
          <div style={S.divider} />

          {/* Row 2: Group / Type / Priority / Grade / Status */}
          <div style={{ ...S.row, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Product Group */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Product Group</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.productGroup} onChange={set("productGroup")}>
                  <option value="">All Groups</option>
                  {productGroups.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>

            {/* Product Type */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Product Type</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.productType} onChange={set("productType")}>
                  <option value="">All Types</option>
                  {productTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>

            {/* Priority */}
            <div style={{ ...S.fieldGroup, maxWidth: 150 }}>
              <label style={S.label}>Priority</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.productPriority} onChange={set("productPriority")}>
                  <option value="">Any</option>
                  {PRIORITIES.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>

            {/* Grade */}
            <div style={{ ...S.fieldGroup, maxWidth: 130 }}>
              <label style={S.label}>Grade</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.productGrade} onChange={set("productGrade")}>
                  <option value="">Any</option>
                  {GRADES.map(v => <option key={v} value={v}>{v}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>

            {/* Status */}
            <div style={{ ...S.fieldGroup, maxWidth: 140 }}>
              <label style={S.label}>Status</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.status} onChange={set("status")}>
                  <option value="">All</option>
                  {STATUSES.map(v => <option key={v} value={v} style={{ textTransform: "capitalize" }}>{v}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>
          </div>

          {/* Row 3: Country / City */}
          <div style={{ ...S.divider, margin: "10px 0" }} />
          <div style={{ ...S.row, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Country */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Country</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.country} onChange={set("country")}>
                  <option value="">All Countries</option>
                  {countries.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>

            {/* Location */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Location</label>
              <div style={S.selectWrap}>
                <FocusSelect style={{ ...S.select, width: "100%" }} value={filters.location} onChange={set("location")}>
                  <option value="">All Locations</option>
                  {locations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </FocusSelect>
                <span style={S.chevron}><ChevronDown size={13} strokeWidth={1.5} /></span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ ...S.row, marginTop: 10, justifyContent: "flex-end" }}>
            {activeCount > 0 && (
              <button style={{ height: 32, padding: "0 10px", background: "transparent", color: "#A8A29E", border: "none", borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                onClick={reset}
                onMouseEnter={e => { e.currentTarget.style.color = "#DC2626"; e.currentTarget.style.background = "#FEF2F2"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#A8A29E"; e.currentTarget.style.background = "transparent"; }}>
                <RotateCcw size={12} strokeWidth={1.5} /> Reset Filters
              </button>
            )}
            <button style={{ ...S.btnPrimary, background: "#FEF0E3", color: "#F5821F", border: "1.5px solid #F5821F" }}
              onClick={() => onSearch(filters)}
              onMouseEnter={e => { e.currentTarget.style.background = "#F5821F"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#FEF0E3"; e.currentTarget.style.color = "#F5821F"; }}>
              <Search size={14} strokeWidth={2} /> Product Search
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductAdvancedSearch;
