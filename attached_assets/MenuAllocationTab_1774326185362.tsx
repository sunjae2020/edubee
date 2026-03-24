/**
 * MenuAllocationTab.tsx
 * 경로: /client/src/components/MenuAllocationTab.tsx
 *
 * Page Access 페이지 내 "Menu Allocation" 탭 컴포넌트
 * - 사이드바 카테고리 순서 변경 (드래그앤드롭)
 * - 카테고리 내 메뉴 순서 변경 (드래그앤드롭)
 * - 메뉴 다른 카테고리로 이동 (드래그앤드롭)
 * - 카테고리·메뉴 이름 변경 (인라인 모달)
 * - 카테고리 추가 / 삭제
 * - 변경사항 일괄 저장
 *
 * 외부 의존성: lucide-react (기존 프로젝트에 이미 설치됨)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
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
  | { type: 'category'; catIndex: number }
  | { type: 'item'; catIndex: number; itemIndex: number };

// ─────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────
const API_BASE = '/api/menu-allocation';

async function fetchMenuAllocation(): Promise<MenuCategory[]> {
  const res = await fetch(API_BASE);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

async function saveOrder(
  categories: MenuCategory[]
): Promise<void> {
  const catPayload = categories.map((c, i) => ({ id: c.id, sort_order: i + 1 }));
  const itemPayload = categories.flatMap((c) =>
    c.items.map((item, i) => ({
      id: item.id,
      category_id: c.id,
      sort_order: i + 1,
    }))
  );
  const res = await fetch(`${API_BASE}/order`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categories: catPayload, items: itemPayload }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

async function renameCategory(id: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/category/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

async function renameItem(id: string, name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/item/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

async function addCategory(name: string): Promise<MenuCategory> {
  const res = await fetch(`${API_BASE}/category`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/category/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
}

// ─────────────────────────────────────────────────────────
// Toast helper
// ─────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, type });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return { toast, show };
}

// ─────────────────────────────────────────────────────────
// Rename Modal
// ─────────────────────────────────────────────────────────
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
    if (open) {
      setValue(initialValue);
      setTimeout(() => inputRef.current?.select(), 80);
    }
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: '24px',
          width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: '#1C1917' }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#57534E', marginBottom: 16 }}>새 이름을 입력하세요</p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(value); if (e.key === 'Escape') onClose(); }}
          style={{
            width: '100%', height: 40, border: '1.5px solid #E8E6E2', borderRadius: 8,
            padding: '0 12px', fontSize: 14, marginBottom: 16, outline: 'none',
            transition: 'border-color .15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = '#F5821F')}
          onBlur={(e) => (e.target.style.borderColor = '#E8E6E2')}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px', border: '1.5px solid #E8E6E2', borderRadius: 8,
              background: '#fff', fontSize: 13, cursor: 'pointer', color: '#57534E',
            }}
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={!value.trim()}
            style={{
              padding: '8px 16px', border: 'none', borderRadius: 8,
              background: value.trim() ? '#F5821F' : '#E8E6E2',
              color: value.trim() ? '#fff' : '#A8A29E',
              fontSize: 13, fontWeight: 600, cursor: value.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────
export default function MenuAllocationTab() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { toast, show: showToast } = useToast();

  // Drag state (refs — no re-render needed)
  const dragPayload = useRef<DragPayload | null>(null);
  const dragOverCat = useRef<number | null>(null);
  const dragOverItem = useRef<{ catIndex: number; itemIndex: number } | null>(null);

  // Rename modal
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    value: string;
    onConfirm: (v: string) => void;
  }>({ open: false, title: '', value: '', onConfirm: () => {} });

  // ── Load ──────────────────────────────────────────────
  useEffect(() => {
    fetchMenuAllocation()
      .then(setCategories)
      .catch(() => showToast('데이터를 불러오지 못했습니다', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const markDirty = () => setIsDirty(true);

  // ── Save ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveOrder(categories);
      setIsDirty(false);
      showToast('메뉴 순서가 저장되었습니다');
    } catch {
      showToast('저장에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = useCallback(() => {
    setLoading(true);
    fetchMenuAllocation()
      .then((data) => { setCategories(data); setIsDirty(false); })
      .catch(() => showToast('불러오기 실패', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Category actions ──────────────────────────────────
  const openRenameCat = (ci: number) => {
    setModal({
      open: true,
      title: '카테고리 이름 변경',
      value: categories[ci].name,
      onConfirm: async (v) => {
        setModal((m) => ({ ...m, open: false }));
        const newName = v.toUpperCase().trim();
        const cat = categories[ci];
        try {
          await renameCategory(cat.id, newName);
          setCategories((prev) => {
            const next = [...prev];
            next[ci] = { ...next[ci], name: newName };
            return next;
          });
          showToast('카테고리 이름이 변경되었습니다');
        } catch {
          showToast('이름 변경 실패', 'error');
        }
      },
    });
  };

  const handleAddCategory = async () => {
    setModal({
      open: true,
      title: '카테고리 추가',
      value: '',
      onConfirm: async (v) => {
        setModal((m) => ({ ...m, open: false }));
        if (!v.trim()) return;
        try {
          const newCat = await addCategory(v);
          setCategories((prev) => [...prev, newCat]);
          showToast('카테고리가 추가되었습니다');
        } catch {
          showToast('카테고리 추가 실패', 'error');
        }
      },
    });
  };

  const handleDeleteCategory = async (ci: number) => {
    const cat = categories[ci];
    if (!window.confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?\n(소속 메뉴 ${cat.items.length}개 함께 비활성화)`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((_, i) => i !== ci));
      showToast('카테고리가 삭제되었습니다');
    } catch {
      showToast('삭제 실패', 'error');
    }
  };

  // ── Item actions ──────────────────────────────────────
  const openRenameItem = (ci: number, ii: number) => {
    const item = categories[ci].items[ii];
    setModal({
      open: true,
      title: '메뉴 이름 변경',
      value: item.name,
      onConfirm: async (v) => {
        setModal((m) => ({ ...m, open: false }));
        const newName = v.trim();
        try {
          await renameItem(item.id, newName);
          setCategories((prev) => {
            const next = prev.map((c) => ({ ...c, items: [...c.items] }));
            next[ci].items[ii] = { ...next[ci].items[ii], name: newName };
            return next;
          });
          showToast('메뉴 이름이 변경되었습니다');
        } catch {
          showToast('이름 변경 실패', 'error');
        }
      },
    });
  };

  // ── Drag handlers ─────────────────────────────────────
  const onCatDragStart = (e: React.DragEvent, ci: number) => {
    dragPayload.current = { type: 'category', catIndex: ci };
    e.dataTransfer.effectAllowed = 'move';
  };

  const onItemDragStart = (e: React.DragEvent, ci: number, ii: number) => {
    dragPayload.current = { type: 'item', catIndex: ci, itemIndex: ii };
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };

  const onCatDragOver = (e: React.DragEvent, ci: number) => {
    const p = dragPayload.current;
    if (!p) return;
    e.preventDefault();
    if (p.type === 'category' && p.catIndex !== ci) dragOverCat.current = ci;
    if (p.type === 'item') { e.stopPropagation(); dragOverCat.current = ci; }
  };

  const onItemDragOver = (e: React.DragEvent, ci: number, ii: number) => {
    const p = dragPayload.current;
    if (!p || p.type !== 'item') return;
    e.preventDefault();
    e.stopPropagation();
    dragOverItem.current = { catIndex: ci, itemIndex: ii };
    dragOverCat.current = null;
  };

  const onCatDrop = (e: React.DragEvent, toCi: number) => {
    e.preventDefault();
    const p = dragPayload.current;
    if (!p) return;

    if (p.type === 'category' && p.catIndex !== toCi) {
      setCategories((prev) => {
        const next = [...prev];
        const [moved] = next.splice(p.catIndex, 1);
        next.splice(toCi, 0, moved);
        return next;
      });
      markDirty();
    }

    if (p.type === 'item') {
      const overItem = dragOverItem.current;
      const fromCi = p.catIndex;
      const fromIi = p.itemIndex;

      if (overItem) {
        // 특정 아이템 위치에 삽입
        const targetCi = overItem.catIndex;
        const targetIi = overItem.itemIndex;
        if (fromCi === targetCi && fromIi === targetIi) return;
        setCategories((prev) => {
          const next = prev.map((c) => ({ ...c, items: [...c.items] }));
          const [moved] = next[fromCi].items.splice(fromIi, 1);
          moved.category_id = next[targetCi].id;
          const adjustedIi = fromCi === targetCi && fromIi < targetIi ? targetIi - 1 : targetIi;
          next[targetCi].items.splice(adjustedIi, 0, moved);
          return next;
        });
      } else {
        // 카테고리 영역 끝에 추가
        if (fromCi === toCi) return;
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

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#A8A29E', fontSize: 14 }}>
        메뉴 데이터를 불러오는 중…
      </div>
    );
  }

  return (
    <>
      {/* Info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#FFF7ED', border: '1px solid #FED7AA',
        borderRadius: 8, padding: '10px 14px', marginBottom: 20,
        fontSize: 12, color: '#9A3412',
      }}>
        <Info size={14} style={{ flexShrink: 0 }} />
        <span>
          <strong>≡</strong> 핸들을 드래그하여 카테고리·메뉴 순서를 변경하거나 다른 카테고리로 이동하세요.
          저장 전까지 실제 사이드바에 반영되지 않습니다.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        {/* ── Left: category list ── */}
        <div>
          {categories.map((cat, ci) => {
            const isCollapsed = collapsed[cat.id];
            return (
              <div
                key={cat.id}
                onDragOver={(e) => onCatDragOver(e, ci)}
                onDrop={(e) => onCatDrop(e, ci)}
                style={{
                  background: '#fff',
                  border: '1.5px solid #E8E6E2',
                  borderRadius: 12,
                  marginBottom: 12,
                  overflow: 'hidden',
                  transition: 'border-color .15s, box-shadow .15s',
                }}
              >
                {/* Category header */}
                <div
                  draggable
                  onDragStart={(e) => onCatDragStart(e, ci)}
                  onDragEnd={onDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', background: '#FAFAF9',
                    borderBottom: isCollapsed ? 'none' : '1px solid #E8E6E2',
                    cursor: 'grab',
                    userSelect: 'none',
                  }}
                >
                  <GripVertical size={16} color="#A8A29E" />
                  <button
                    onClick={() => setCollapsed((p) => ({ ...p, [cat.id]: !isCollapsed }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
                  >
                    {isCollapsed
                      ? <ChevronRight size={14} color="#A8A29E" />
                      : <ChevronDown size={14} color="#A8A29E" />}
                  </button>

                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1C1917', letterSpacing: '.03em' }}>
                    {cat.name}
                  </span>
                  <span style={{ fontSize: 12, color: '#A8A29E' }}>{cat.items.length} items</span>

                  {/* Rename */}
                  <button
                    onClick={(e) => { e.stopPropagation(); openRenameCat(ci); }}
                    title="이름 변경"
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: '1px solid #E8E6E2',
                      background: '#fff', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#57534E',
                    }}
                  >
                    <Pencil size={12} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(ci); }}
                    title="카테고리 삭제"
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: '1px solid #FECACA',
                      background: '#FEF2F2', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#DC2626',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>

                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '.06em',
                    textTransform: 'uppercase' as const,
                    background: '#FEF0E3', color: '#F5821F',
                    padding: '3px 8px', borderRadius: 999,
                  }}>
                    Category
                  </span>
                </div>

                {/* Menu items */}
                {!isCollapsed && (
                  <div style={{ padding: 8, minHeight: 48 }}>
                    {cat.items.length === 0 && (
                      <div style={{
                        padding: '12px', textAlign: 'center', fontSize: 12,
                        color: '#A8A29E', border: '1.5px dashed #E8E6E2', borderRadius: 8,
                      }}>
                        이 카테고리로 메뉴를 드래그하세요
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
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', borderRadius: 8,
                          background: '#fff', border: '1px solid #E8E6E2',
                          marginBottom: 4, cursor: 'grab',
                          transition: 'background .1s, border-color .1s',
                          userSelect: 'none',
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget;
                          el.querySelector<HTMLDivElement>('.item-actions')!.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget;
                          el.querySelector<HTMLDivElement>('.item-actions')!.style.opacity = '0';
                        }}
                      >
                        <GripVertical size={14} color="#A8A29E" style={{ flexShrink: 0 }} />

                        <div style={{
                          width: 28, height: 28, borderRadius: 6, border: '1px solid #E8E6E2',
                          background: '#FAFAF9', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 13, flexShrink: 0,
                        }}>
                          {iconEmoji(item.icon_name)}
                        </div>

                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1C1917' }}>
                          {item.name}
                        </span>

                        <div
                          className="item-actions"
                          style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity .15s' }}
                        >
                          <button
                            onClick={() => openRenameItem(ci, ii)}
                            title="이름 변경"
                            style={{
                              width: 26, height: 26, borderRadius: 6, border: '1px solid #E8E6E2',
                              background: '#fff', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', color: '#57534E',
                            }}
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
              width: '100%', padding: '10px', border: '1.5px dashed #E8E6E2',
              borderRadius: 8, background: 'transparent', color: '#57534E',
              fontSize: 13, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#F5821F';
              e.currentTarget.style.color = '#F5821F';
              e.currentTarget.style.background = '#FEF0E3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E8E6E2';
              e.currentTarget.style.color = '#57534E';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Plus size={14} /> 카테고리 추가
          </button>

          {/* Unsaved changes bar */}
          {isDirty && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FFF7ED', border: '1px solid #FED7AA',
              borderRadius: 10, padding: '12px 16px', marginTop: 16,
            }}>
              <p style={{ fontSize: 12, color: '#9A3412', fontWeight: 500 }}>
                저장되지 않은 변경사항이 있습니다
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleDiscard}
                  style={{
                    padding: '6px 12px', border: '1px solid #E8E6E2',
                    borderRadius: 7, background: '#fff', fontSize: 12,
                    cursor: 'pointer', color: '#57534E',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <RotateCcw size={11} /> 되돌리기
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '6px 14px', border: 'none', borderRadius: 7,
                    background: saving ? '#E8E6E2' : '#F5821F',
                    color: saving ? '#A8A29E' : '#fff',
                    fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Save size={11} /> {saving ? '저장 중…' : '순서 저장'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: sidebar preview ── */}
        <div>
          <div style={{
            background: '#fff', border: '1px solid #E8E6E2',
            borderRadius: 12, padding: 16,
          }}>
            <h3 style={{
              fontSize: 13, fontWeight: 600, color: '#1C1917',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 4, background: '#FEF0E3',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, color: '#F5821F' }}>▶</span>
              </span>
              사이드바 미리보기
            </h3>
            <div style={{ fontSize: 12, color: '#57534E', lineHeight: 1.8 }}>
              {categories.map((cat) => (
                <div key={cat.id} style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const,
                    letterSpacing: '.06em', color: '#A8A29E', marginBottom: 3,
                  }}>
                    {cat.name}
                  </div>
                  {cat.items.map((item) => (
                    <div key={item.id} style={{
                      padding: '2px 8px', color: '#57534E', fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span>{iconEmoji(item.icon_name)}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                  {cat.items.length === 0 && (
                    <div style={{ padding: '2px 8px', color: '#A8A29E', fontSize: 11, fontStyle: 'italic' }}>
                      (비어있음)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{
            background: '#fff', border: '1px solid #E8E6E2',
            borderRadius: 12, padding: 16, marginTop: 12,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1C1917', marginBottom: 10 }}>
              사용법
            </h3>
            {[
              ['≡', '카테고리 행 드래그 → 카테고리 순서 변경'],
              ['⠿', '메뉴 아이템 드래그 → 순서 변경 또는 다른 카테고리로 이동'],
              ['✏', '연필 아이콘 클릭 → 이름 변경'],
              ['🗑', '카테고리 휴지통 클릭 → 카테고리 삭제'],
            ].map(([icon, desc]) => (
              <div key={icon} style={{
                display: 'flex', gap: 8, marginBottom: 8,
                fontSize: 12, color: '#57534E', lineHeight: 1.5,
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 4, background: '#FEF0E3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#F5821F', flexShrink: 0,
                }}>
                  {icon}
                </span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rename modal */}
      <RenameModal
        open={modal.open}
        title={modal.title}
        initialValue={modal.value}
        onConfirm={modal.onConfirm}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#1C1917' : '#DC2626',
          color: '#fff', padding: '10px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// Lucide icon name → emoji fallback (아이콘 라이브러리 없이도 동작)
// ─────────────────────────────────────────────────────────
function iconEmoji(iconName: string | null): string {
  const map: Record<string, string> = {
    LayoutDashboard: '🏠', Users: '👥', ClipboardList: '📋', FileText: '📝',
    Package: '📦', UserCog: '👤', School: '🏫', Hotel: '🏨', Bus: '🚐',
    Map: '🗺', Mic: '🎤', BarChart2: '📊', CreditCard: '💳', Receipt: '🧾',
    DollarSign: '💰', TrendingUp: '📈', Settings: '⚙️', Lock: '🔐',
    FileSearch: '📜',
  };
  return iconName ? (map[iconName] ?? '📄') : '📄';
}
