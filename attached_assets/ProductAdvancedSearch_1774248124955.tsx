import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, X, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProductSearchFilters {
  searchCategory: string;
  searchText: string;
  groupCategory: string;
  productGroup: string;
  productType: string;
  productPriority: string;
  productGrade: string;
  status: string;
}

interface ProductAdvancedSearchProps {
  /** Called when the main Search button is clicked */
  onSearch: (filters: ProductSearchFilters) => void;
  /** Called when the Product Search button (advanced) is clicked */
  onProductSearch?: (filters: ProductSearchFilters) => void;
  /** Options for dropdowns — pass from your API/store */
  options?: {
    searchCategories?: { value: string; label: string }[];
    groupCategories?: { value: string; label: string }[];
    productGroups?: { value: string; label: string }[];
    productTypes?: { value: string; label: string }[];
    productGrades?: { value: string; label: string }[];
  };
}

// ─── Default dropdown options (replace with real data from your API) ──────────
const DEFAULT_SEARCH_CATEGORIES = [
  { value: "name", label: "Product Name" },
  { value: "provider", label: "Provider (School)" },
  { value: "avetmiss", label: "AVETMISS Program ID" },
];

const DEFAULT_GROUP_CATEGORIES = [
  { value: "general_english", label: "General English" },
  { value: "vocational", label: "Vocational" },
  { value: "oshc", label: "OSHC" },
  { value: "job_placement", label: "Job Placement" },
];

const DEFAULT_PRODUCT_GRADES = [
  { value: "certificate_iii", label: "Certificate III" },
  { value: "certificate_iv", label: "Certificate IV" },
  { value: "diploma", label: "Diploma" },
  { value: "advanced_diploma", label: "Advanced Diploma" },
  { value: "bachelor", label: "Bachelor" },
  { value: "master", label: "Master" },
];

// ─── Styles (Edubee Design System) ───────────────────────────────────────────
const S = {
  wrapper: {
    background: "#FFFFFF",
    border: "1px solid #E8E6E2",
    borderRadius: "12px",
    padding: "16px 20px",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  } as React.CSSProperties,

  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,

  select: {
    height: "40px",
    border: "1.5px solid #E8E6E2",
    borderRadius: "8px",
    padding: "0 36px 0 12px",
    fontSize: "14px",
    color: "#1C1917",
    background: "#FFFFFF",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    cursor: "pointer",
    outline: "none",
    transition: "border-color 200ms, box-shadow 200ms",
    flexShrink: 0,
  } as React.CSSProperties,

  input: {
    height: "40px",
    border: "1.5px solid #E8E6E2",
    borderRadius: "8px",
    padding: "0 12px",
    fontSize: "14px",
    color: "#1C1917",
    background: "#FFFFFF",
    outline: "none",
    transition: "border-color 200ms, box-shadow 200ms",
    flex: 1,
  } as React.CSSProperties,

  btnPrimary: {
    height: "40px",
    padding: "0 20px",
    background: "#F5821F",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap" as const,
    transition: "background 200ms, transform 200ms, box-shadow 200ms",
    flexShrink: 0,
  } as React.CSSProperties,

  btnProductSearch: {
    height: "40px",
    padding: "0 20px",
    background: "#FEF0E3",
    color: "#F5821F",
    border: "1.5px solid #F5821F",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap" as const,
    transition: "background 200ms, transform 200ms",
    flexShrink: 0,
  } as React.CSSProperties,

  btnAdvancedToggle: {
    height: "32px",
    padding: "0 12px",
    background: "transparent",
    color: "#57534E",
    border: "1.5px solid #E8E6E2",
    borderRadius: "8px",
    fontWeight: 500,
    fontSize: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background 200ms, color 200ms, border-color 200ms",
    flexShrink: 0,
  } as React.CSSProperties,

  btnReset: {
    height: "32px",
    padding: "0 10px",
    background: "transparent",
    color: "#A8A29E",
    border: "none",
    borderRadius: "8px",
    fontWeight: 500,
    fontSize: "13px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "color 200ms, background 200ms",
  } as React.CSSProperties,

  divider: {
    height: "1px",
    background: "#F4F3F1",
    margin: "14px 0",
  } as React.CSSProperties,

  label: {
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#A8A29E",
    marginBottom: "6px",
    display: "block",
  } as React.CSSProperties,

  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minWidth: "140px",
  } as React.CSSProperties,

  selectWrapper: {
    position: "relative" as const,
    display: "flex",
    flex: 1,
  } as React.CSSProperties,

  chevronIcon: {
    position: "absolute" as const,
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none" as const,
    color: "#A8A29E",
  } as React.CSSProperties,

  activeIndicator: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#F5821F",
    flexShrink: 0,
  } as React.CSSProperties,
};

// ─── Component ────────────────────────────────────────────────────────────────
export function ProductAdvancedSearch({
  onSearch,
  onProductSearch,
  options = {},
}: ProductAdvancedSearchProps) {
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [filters, setFilters] = useState<ProductSearchFilters>({
    searchCategory: "",
    searchText: "",
    groupCategory: "",
    productGroup: "",
    productType: "",
    productPriority: "",
    productGrade: "",
    status: "",
  });

  const set = (key: keyof ProductSearchFilters) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  const handleReset = () => {
    setFilters({
      searchCategory: "",
      searchText: "",
      groupCategory: "",
      productGroup: "",
      productType: "",
      productPriority: "",
      productGrade: "",
      status: "",
    });
  };

  const advancedFilledCount = [
    filters.groupCategory,
    filters.productGroup,
    filters.productType,
    filters.productPriority,
    filters.productGrade,
    filters.status,
  ].filter(Boolean).length;

  const searchCategories = options.searchCategories ?? DEFAULT_SEARCH_CATEGORIES;
  const groupCategories = options.groupCategories ?? DEFAULT_GROUP_CATEGORIES;
  const productGroups = options.productGroups ?? [];
  const productTypes = options.productTypes ?? [];
  const productGrades = options.productGrades ?? DEFAULT_PRODUCT_GRADES;

  return (
    <div style={S.wrapper}>
      {/* ── Row 1: Basic Search ────────────────────────────────────────── */}
      <div style={S.row}>
        {/* Search Category */}
        <div style={{ ...S.selectWrapper, flex: "0 0 200px" }}>
          <select
            style={{ ...S.select, width: "100%" }}
            value={filters.searchCategory}
            onChange={set("searchCategory")}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#F5821F";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E8E6E2";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <option value="">Search Category</option>
            {searchCategories.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span style={S.chevronIcon}>
            <ChevronDown size={14} strokeWidth={1.5} />
          </span>
        </div>

        {/* Search Text */}
        <div style={{ position: "relative", flex: 1 }}>
          <input
            style={{ ...S.input, paddingLeft: "36px" }}
            placeholder="Search products..."
            value={filters.searchText}
            onChange={set("searchText")}
            onKeyDown={(e) => e.key === "Enter" && onSearch(filters)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#F5821F";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#E8E6E2";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
          <Search
            size={15}
            strokeWidth={1.5}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#A8A29E",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Search Button */}
        <button
          style={S.btnPrimary}
          onClick={() => onSearch(filters)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#D96A0A";
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(245,130,31,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#F5821F";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <Search size={15} strokeWidth={2} />
          Search
        </button>

        {/* Advanced Search Toggle */}
        <button
          style={{
            ...S.btnAdvancedToggle,
            ...(isAdvanced
              ? { background: "#FEF0E3", color: "#F5821F", borderColor: "#F5821F" }
              : {}),
          }}
          onClick={() => setIsAdvanced((v) => !v)}
          onMouseEnter={(e) => {
            if (!isAdvanced) {
              e.currentTarget.style.background = "#F4F3F1";
              e.currentTarget.style.color = "#1C1917";
            }
          }}
          onMouseLeave={(e) => {
            if (!isAdvanced) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#57534E";
            }
          }}
        >
          <SlidersHorizontal size={14} strokeWidth={1.5} />
          Advanced
          {advancedFilledCount > 0 && (
            <span
              style={{
                background: "#F5821F",
                color: "#FFFFFF",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                padding: "1px 7px",
                lineHeight: "18px",
              }}
            >
              {advancedFilledCount}
            </span>
          )}
          {isAdvanced ? (
            <ChevronDown
              size={13}
              strokeWidth={2}
              style={{ transform: "rotate(180deg)", transition: "transform 200ms" }}
            />
          ) : (
            <ChevronDown
              size={13}
              strokeWidth={2}
              style={{ transform: "rotate(0deg)", transition: "transform 200ms" }}
            />
          )}
        </button>
      </div>

      {/* ── Advanced Search Panel ──────────────────────────────────────── */}
      {isAdvanced && (
        <>
          <div style={S.divider} />

          {/* Row 2: Group Category / Product Group / Product Type */}
          <div style={{ ...S.row, flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Group Category */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Group Category</label>
              <div style={S.selectWrapper}>
                <select
                  style={{ ...S.select, width: "100%" }}
                  value={filters.groupCategory}
                  onChange={set("groupCategory")}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#F5821F";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E8E6E2";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">All Groups</option>
                  {groupCategories.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={S.chevronIcon}>
                  <ChevronDown size={14} strokeWidth={1.5} />
                </span>
              </div>
            </div>

            {/* Product Group */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Product Group</label>
              <div style={S.selectWrapper}>
                <select
                  style={{ ...S.select, width: "100%" }}
                  value={filters.productGroup}
                  onChange={set("productGroup")}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#F5821F";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E8E6E2";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">All Product Groups</option>
                  {productGroups.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={S.chevronIcon}>
                  <ChevronDown size={14} strokeWidth={1.5} />
                </span>
              </div>
            </div>

            {/* Product Type */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Product Type</label>
              <div style={S.selectWrapper}>
                <select
                  style={{ ...S.select, width: "100%" }}
                  value={filters.productType}
                  onChange={set("productType")}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#F5821F";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E8E6E2";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">All Types</option>
                  {productTypes.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={S.chevronIcon}>
                  <ChevronDown size={14} strokeWidth={1.5} />
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Product Priority / Product Grade / Status / Buttons */}
          <div style={{ ...S.row, marginTop: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
            {/* Product Priority */}
            <div style={{ ...S.fieldGroup, maxWidth: "160px" }}>
              <label style={S.label}>Product Priority</label>
              <input
                type="number"
                min={1}
                style={S.input}
                placeholder="e.g. 1 (highest)"
                value={filters.productPriority}
                onChange={set("productPriority")}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#F5821F";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#E8E6E2";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Product Grade */}
            <div style={S.fieldGroup}>
              <label style={S.label}>Product Grade</label>
              <div style={S.selectWrapper}>
                <select
                  style={{ ...S.select, width: "100%" }}
                  value={filters.productGrade}
                  onChange={set("productGrade")}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#F5821F";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E8E6E2";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">All Grades</option>
                  {productGrades.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span style={S.chevronIcon}>
                  <ChevronDown size={14} strokeWidth={1.5} />
                </span>
              </div>
            </div>

            {/* Status */}
            <div style={{ ...S.fieldGroup, maxWidth: "150px" }}>
              <label style={S.label}>Status</label>
              <div style={S.selectWrapper}>
                <select
                  style={{ ...S.select, width: "100%" }}
                  value={filters.status}
                  onChange={set("status")}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#F5821F";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,130,31,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#E8E6E2";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <span style={S.chevronIcon}>
                  <ChevronDown size={14} strokeWidth={1.5} />
                </span>
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Reset Button */}
            {advancedFilledCount > 0 && (
              <button
                style={S.btnReset}
                onClick={handleReset}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#DC2626";
                  e.currentTarget.style.background = "#FEF2F2";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#A8A29E";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <RotateCcw size={13} strokeWidth={1.5} />
                Reset
              </button>
            )}

            {/* Product Search Button */}
            <button
              style={S.btnProductSearch}
              onClick={() => (onProductSearch ?? onSearch)(filters)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5821F";
                e.currentTarget.style.color = "#FFFFFF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FEF0E3";
                e.currentTarget.style.color = "#F5821F";
              }}
            >
              <Search size={15} strokeWidth={2} />
              Product Search
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductAdvancedSearch;
