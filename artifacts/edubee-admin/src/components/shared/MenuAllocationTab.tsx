import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  GripVertical, Pencil, Trash2, Plus, Save, RotateCcw,
  ChevronDown, ChevronRight, Info,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = `${BASE}/api/menu-allocation`;

interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  route_key: string;
  icon_name: string | null;
  sort_order: number;
  is_visible: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

type DragPayload =
  | { type: "category"; catIndex: number }
  | { type: "item"; catIndex: number; itemIndex: number };

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("edubee_token") ?? sessionStorage.getItem("edubee_token") ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchMenuAllocation(): Promise<MenuCategory[]> {
  const res = await fetch(API_BASE, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

async function saveOrder(categories: MenuCategory[]): Promise<void> {
  const catPayload = categories.map((c, i) => ({ id: c.id, sort_order: i + 1 }));
  const itemPayload = categories.flatMap((c) =>
    c.items.map((item, i) => ({ id: item.id, category_id: c.id, sort_order: i + 1 }))
  );
  const token = localStorage.getItem("edubee_token") ?? sessionStorage.getItem("edubee_token") ?? "";
  const res = await fetch(`${API_BASE}/order`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ categories: catPayload, items: itemPayload }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

function useToken() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const t = localStorage.getItem("edubee_token") ?? sessionStorage.getItem("edubee_token") ?? "";
    if (t) headers["Authorization"] = `Bearer ${t}`;
  } catch {}
  return headers;
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, type: "success" | "error" = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);
  return { toast, show };
}

interface RenameModalProps {
  open: boolean;
  title: string;
  initialValue: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

function RenameModal({ open, title, initialValue, onConfirm, onClose }: RenameModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setValue(initialValue); setTimeout(() => inputRef.current?.select(), 80); }
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "#1C1917" }}>{title}</h3>
        <p style={{ fontSize: 13, color: "#57534E", marginBottom: 16 }}>Enter a new name</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onConfirm(value); if (e.key === "Escape") onClose(); }}
          style={{
            width: "100%", height: 40, border: "1.5px solid #E8E6E2", borderRadius: 8,
            padding: "0 12px", fontSize: 14, marginBottom: 16, outline: "none", boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--e-orange)")}
          onBlur={(e) => (e.target.style.borderColor = "#E8E6E2")}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 14px", border: "1.5px solid #E8E6E2", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#57534E" }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            style={{
              padding: "8px 16px", border: "none", borderRadius: 8,
              background: value.trim() ? "var(--e-orange)" : "#E8E6E2",
              color: value.trim() ? "#fff" : "#A8A29E",
              fontSize: 13, fontWeight: 600, cursor: value.trim() ? "pointer" : "not-allowed",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function iconEmoji(iconName: string | null): string {
  const map: Record<string, string> = {
    // Dashboard
    LayoutDashboard: "📊",
    // CRM
    Users: "👥", Users2: "👫", Building2: "🏢", Target: "🎯", FileText: "📄",
    FileCheck: "✅", Ticket: "🎫",
    // Sales / Forms
    ClipboardList: "📋", FolderOpen: "📂", Globe: "🌐", MessageSquare: "💬",
    CalendarCheck: "📅",
    // Camp
    Layers: "🗂️", Package: "📦", ListChecks: "✅",
    GraduationCap: "🎓", Hotel: "🏨", Car: "🚗", Map: "🗺️",
    // Services
    Briefcase: "💼", Shield: "🛡️", Wrench: "🔧", Stamp: "🛂",
    // Products
    ShoppingBag: "🛍️", Tag: "🏷️", Tags: "🏷️", Percent: "💯", BadgeDollarSign: "💲",
    // Finance
    Receipt: "🧾", CreditCard: "💳", ArrowLeftRight: "↔️", Wallet: "👛",
    BookMarked: "📑", BookOpen: "📖", RefreshCw: "🔄", Landmark: "🏦",
    // Reports
    BarChart2: "📊",
    // AI
    Bot: "🤖",
    // Admin
    UserCog: "🧑‍💼", UserSearch: "🔍", Palette: "🎨", Cable: "🔌",
    // Settings
    Settings: "⚙️", Lock: "🔐", Grid2x2: "🔲", FileSearch: "📜",
    Database: "🗄️",
  };
  return iconName ? (map[iconName] ?? "📄") : "📄";
}

export default function MenuAllocationTab() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { toast, show: showToast } = useToast();
  const headers = useToken();

  const dragPayload = useRef<DragPayload | null>(null);
  const dragOverCat = useRef<number | null>(null);
  const dragOverItem = useRef<{ catIndex: number; itemIndex: number } | null>(null);

  const [modal, setModal] = useState<{
    open: boolean; title: string; value: string; onConfirm: (v: string) => void;
  }>({ open: false, title: "", value: "", onConfirm: () => {} });

  useEffect(() => {
    fetchMenuAllocation()
      .then(setCategories)
      .catch(() => showToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, []);

  const markDirty = () => setIsDirty(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOrder(categories);
      setIsDirty(false);
      showToast("Menu order saved successfully");
    } catch {
      showToast("Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = useCallback(() => {
    setLoading(true);
    fetchMenuAllocation()
      .then((data) => { setCategories(data); setIsDirty(false); })
      .catch(() => showToast("Failed to reload", "error"))
      .finally(() => setLoading(false));
  }, []);

  const openRenameCat = (ci: number) => {
    setModal({
      open: true, title: "Rename Category", value: categories[ci].name,
      onConfirm: async (v) => {
        setModal((m) => ({ ...m, open: false }));
        const newName = v.toUpperCase().trim();
        const cat = categories[ci];
        try {
          await fetch(`${API_BASE}/category/${cat.id}`, {
            method: "PATCH", headers, body: JSON.stringify({ name: newName }),
          });
          setCategories((prev) => { const next = [...prev]; next[ci] = { ...next[ci], name: newName }; return next; });
          showToast("Category renamed successfully");
        } catch { showToast("Failed to rename category", "error"); }
      },
    });
  };

  const handleAddCategory = () => {
    setModal({
      open: true, title: "Add Category", value: "",
      onConfirm: async (v) => {
        setModal((m) => ({ ...m, open: false }));
        if (!v.trim()) return;
        try {
          const res = await fetch(`${API_BASE}/category`, {
            method: "POST", headers, body: JSON.stringify({ name: v }),
          });
          const json = await res.json();
          if (!json.success) throw new Error();
          setCategories((prev) => [...prev, json.data]);
          showToast("Category added successfully");
        } catch { showToast("Failed to add category", "error"); }
      },
    });
  };

  const handleDeleteCategory = async (ci: number) => {
    const cat = categories[ci];
    if (!window.confirm(`Delete category "${cat.name}"?\n(${cat.items.length} menu item(s) will also be deactivated)`)) return;
    try {
      await fetch(`${API_BASE}/category/${cat.id}`, { method: "DELETE", headers });
      setCategories((prev) => prev.filter((_, i) => i !== ci));
      showToast("Category deleted successfully");
    } catch { showToast("Failed to delete category", "error"); }
  };

  const openRenameItem = (ci: number, ii: number) => {
    const item = categories[ci].items[ii];
    setModal({
      open: true, title: "Rename Menu Item", value: item.name,
      onConfirm: async (v) => {
        setModal((m) => ({ ...m, open: false }));
        const newName = v.trim();
        try {
          await fetch(`${API_BASE}/item/${item.id}`, {
            method: "PATCH", headers, body: JSON.stringify({ name: newName }),
          });
          setCategories((prev) => {
            const next = prev.map((c) => ({ ...c, items: [...c.items] }));
            next[ci].items[ii] = { ...next[ci].items[ii], name: newName };
            return next;
          });
          showToast("Menu item renamed successfully");
        } catch { showToast("Failed to rename item", "error"); }
      },
    });
  };

  // Drag handlers
  const onCatDragStart = (e: React.DragEvent, ci: number) => {
    dragPayload.current = { type: "category", catIndex: ci };
    e.dataTransfer.effectAllowed = "move";
  };

  const onItemDragStart = (e: React.DragEvent, ci: number, ii: number) => {
    dragPayload.current = { type: "item", catIndex: ci, itemIndex: ii };
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  const onCatDragOver = (e: React.DragEvent, ci: number) => {
    const p = dragPayload.current;
    if (!p) return;
    e.preventDefault();
    if (p.type === "category" && p.catIndex !== ci) dragOverCat.current = ci;
    if (p.type === "item") { e.stopPropagation(); dragOverCat.current = ci; }
  };

  const onItemDragOver = (e: React.DragEvent, ci: number, ii: number) => {
    const p = dragPayload.current;
    if (!p || p.type !== "item") return;
    e.preventDefault();
    e.stopPropagation();
    dragOverItem.current = { catIndex: ci, itemIndex: ii };
    dragOverCat.current = null;
  };

  const onCatDrop = (e: React.DragEvent, toCi: number) => {
    e.preventDefault();
    const p = dragPayload.current;
    if (!p) return;

    if (p.type === "category" && p.catIndex !== toCi) {
      setCategories((prev) => {
        const next = [...prev];
        const [moved] = next.splice(p.catIndex, 1);
        next.splice(toCi, 0, moved);
        return next;
      });
      markDirty();
    }

    if (p.type === "item") {
      const overItem = dragOverItem.current;
      const fromCi = p.catIndex;
      const fromIi = p.itemIndex;
      if (overItem) {
        const { catIndex: targetCi, itemIndex: targetIi } = overItem;
        if (fromCi === targetCi && fromIi === targetIi) { dragPayload.current = null; dragOverCat.current = null; dragOverItem.current = null; return; }
        setCategories((prev) => {
          const next = prev.map((c) => ({ ...c, items: [...c.items] }));
          const [moved] = next[fromCi].items.splice(fromIi, 1);
          moved.category_id = next[targetCi].id;
          const adjustedIi = fromCi === targetCi && fromIi < targetIi ? targetIi - 1 : targetIi;
          next[targetCi].items.splice(adjustedIi, 0, moved);
          return next;
        });
      } else {
        if (fromCi === toCi) { dragPayload.current = null; dragOverCat.current = null; dragOverItem.current = null; return; }
        setCategories((prev) => {
          const next = prev.map((c) => ({ ...c, items: [...c.items] }));
          const [moved] = next[fromCi].items.splice(fromIi, 1);
          moved.category_id = next[toCi].id;
          next[toCi].items.push(moved);
          return next;
        });
      }
      markDirty();
    }

    dragPayload.current = null;
    dragOverCat.current = null;
    dragOverItem.current = null;
  };

  const onDragEnd = () => {
    dragPayload.current = null;
    dragOverCat.current = null;
    dragOverItem.current = null;
  };

  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "#A8A29E", fontSize: 14 }}>
        Loading menu data…
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "#FFF7ED", border: "1px solid #FED7AA",
        borderRadius: 8, padding: "10px 14px", marginBottom: 20,
        fontSize: 12, color: "#9A3412",
      }}>
        <Info size={14} style={{ flexShrink: 0 }} />
        <span>
          Drag the <strong>≡</strong> handle to reorder categories or menu items, or move items between categories.
          Changes are not reflected in the sidebar until saved.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
        {/* Left: category list */}
        <div>
          {categories.map((cat, ci) => {
            const isCollapsed = collapsed[cat.id];
            return (
              <div
                key={cat.id}
                onDragOver={(e) => onCatDragOver(e, ci)}
                onDrop={(e) => onCatDrop(e, ci)}
                style={{
                  background: "#fff", border: "1.5px solid #E8E6E2",
                  borderRadius: 12, marginBottom: 12, overflow: "hidden",
                  transition: "border-color .15s, box-shadow .15s",
                }}
              >
                {/* Category header */}
                <div
                  draggable
                  onDragStart={(e) => onCatDragStart(e, ci)}
                  onDragEnd={onDragEnd}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", background: "#FAFAF9",
                    borderBottom: isCollapsed ? "none" : "1px solid #E8E6E2",
                    cursor: "grab", userSelect: "none",
                  }}
                >
                  <GripVertical size={16} color="#A8A29E" />
                  <button
                    onClick={() => setCollapsed((p) => ({ ...p, [cat.id]: !isCollapsed }))}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}
                  >
                    {isCollapsed ? <ChevronRight size={14} color="#A8A29E" /> : <ChevronDown size={14} color="#A8A29E" />}
                  </button>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#1C1917", letterSpacing: ".03em" }}>
                    {cat.name}
                  </span>
                  <span style={{ fontSize: 12, color: "#A8A29E" }}>{cat.items.length} items</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openRenameCat(ci); }}
                    title="Rename"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8E6E2", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#57534E" }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(ci); }}
                    title="Delete category"
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#DC2626" }}
                  >
                    <Trash2 size={12} />
                  </button>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", background: "var(--e-orange-lt)", color: "var(--e-orange)", padding: "3px 8px", borderRadius: 999 }}>
                    Category
                  </span>
                </div>

                {/* Menu items */}
                {!isCollapsed && (
                  <div style={{ padding: 8, minHeight: 48 }}>
                    {cat.items.length === 0 && (
                      <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "#A8A29E", border: "1.5px dashed #E8E6E2", borderRadius: 8 }}>
                        Drag menu items here
                      </div>
                    )}
                    {cat.items.map((item, ii) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => onItemDragStart(e, ci, ii)}
                        onDragOver={(e) => onItemDragOver(e, ci, ii)}
                        onDragEnd={onDragEnd}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 8, background: "#fff",
                          border: "1px solid #E8E6E2", marginBottom: 4, cursor: "grab",
                          transition: "background .1s, border-color .1s", userSelect: "none",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget.querySelector(".item-actions") as HTMLElement | null)?.style.setProperty("opacity", "1");
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget.querySelector(".item-actions") as HTMLElement | null)?.style.setProperty("opacity", "0");
                        }}
                      >
                        <GripVertical size={14} color="#A8A29E" style={{ flexShrink: 0 }} />
                        <div style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #E8E6E2", background: "#FAFAF9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                          {iconEmoji(item.icon_name)}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1C1917" }}>
                          {item.name}
                        </span>
                        <div className="item-actions" style={{ display: "flex", gap: 4, opacity: 0, transition: "opacity .15s" }}>
                          <button
                            onClick={() => openRenameItem(ci, ii)}
                            title="Rename item"
                            style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #E8E6E2", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#57534E" }}
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add category */}
          <button
            onClick={handleAddCategory}
            style={{
              width: "100%", padding: 10, border: "1.5px dashed #E8E6E2", borderRadius: 8,
              background: "transparent", color: "#57534E", fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--e-orange)"; e.currentTarget.style.color = "var(--e-orange)"; e.currentTarget.style.background = "var(--e-orange-lt)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E6E2"; e.currentTarget.style.color = "#57534E"; e.currentTarget.style.background = "transparent"; }}
          >
            <Plus size={14} /> Add Category
          </button>

          {/* Unsaved changes bar */}
          {isDirty && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 16px", marginTop: 16 }}>
              <p style={{ fontSize: 12, color: "#9A3412", fontWeight: 500 }}>You have unsaved changes</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleDiscard}
                  style={{ padding: "6px 12px", border: "1px solid #E8E6E2", borderRadius: 7, background: "#fff", fontSize: 12, cursor: "pointer", color: "#57534E", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <RotateCcw size={11} /> Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: "6px 14px", border: "none", borderRadius: 7, background: saving ? "#E8E6E2" : "var(--e-orange)", color: saving ? "#A8A29E" : "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Save size={11} /> {saving ? "Saving…" : "Save Order"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: sidebar preview */}
        <div>
          <div style={{ background: "#fff", border: "1px solid #E8E6E2", borderRadius: 12, padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--e-orange-lt)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, color: "var(--e-orange)" }}>▶</span>
              </span>
              Sidebar Preview
            </h3>
            <div style={{ fontSize: 12, color: "#57534E", lineHeight: 1.8 }}>
              {categories.map((cat) => (
                <div key={cat.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: "#A8A29E", marginBottom: 3 }}>
                    {cat.name}
                  </div>
                  {cat.items.map((item) => (
                    <div key={item.id} style={{ padding: "2px 8px", color: "#57534E", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{iconEmoji(item.icon_name)}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                  {cat.items.length === 0 && (
                    <div style={{ padding: "2px 8px", color: "#A8A29E", fontSize: 11, fontStyle: "italic" }}>(empty)</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #E8E6E2", borderRadius: 12, padding: 16, marginTop: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1C1917", marginBottom: 10 }}>How to Use</h3>
            {[
              ["≡", "Drag a category row to reorder categories"],
              ["⠿", "Drag a menu item to reorder or move it to another category"],
              ["✏", "Click the pencil icon to rename"],
              ["🗑", "Click the trash icon to delete a category"],
            ].map(([icon, desc]) => (
              <div key={icon} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "#57534E", lineHeight: 1.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: 4, background: "var(--e-orange-lt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--e-orange)", flexShrink: 0 }}>
                  {icon}
                </span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RenameModal
        open={modal.open}
        title={modal.title}
        initialValue={modal.value}
        onConfirm={modal.onConfirm}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "success" ? "#1C1917" : "#DC2626",
          color: "#fff", padding: "10px 20px", borderRadius: 8,
          fontSize: 13, fontWeight: 500, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}
