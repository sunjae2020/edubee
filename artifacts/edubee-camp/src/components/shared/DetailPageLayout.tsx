import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Pencil, Save, X, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
}

interface DetailPageLayoutProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  backPath: string;
  backLabel?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  canEdit?: boolean;
  isEditing?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function DetailPageLayout({
  title,
  subtitle,
  badge,
  backPath,
  backLabel = "Back",
  tabs,
  activeTab,
  onTabChange,
  canEdit = false,
  isEditing = false,
  isDirty = false,
  isSaving = false,
  onEdit,
  onSave,
  onCancel,
  headerExtra,
  children,
}: DetailPageLayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-full flex flex-col bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: back + title */}
          <div className="min-w-0">
            <button
              onClick={() => setLocation(backPath)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </button>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            {/* Always-edit mode: show Discard + Save Changes only when dirty */}
            {isDirty && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </>
            )}
            {/* Toggle-edit mode (legacy): Edit / Cancel+Save */}
            {!isDirty && canEdit && !isEditing && (
              <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {!isDirty && isEditing && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={isSaving}
                  className="gap-1.5 bg-[#F5821F] hover:bg-[#d97706] text-white"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 mt-4 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors",
                  activeTab === tab.key
                    ? "border-[#F5821F] text-[#F5821F] bg-orange-50/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-sm text-amber-700">
          <span className="text-amber-500 text-base">●</span>
          You have unsaved changes — click <strong className="mx-1">Save Changes</strong> to apply.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5", className)}>
      {title && <div className="text-xs font-semibold text-[#F5821F] uppercase tracking-widest mb-4 pb-2 border-b border-[#F5821F]/20">{title}</div>}
      {children}
    </div>
  );
}

export function DetailRow({
  label,
  value,
  children,
  className,
}: {
  label: ReactNode;
  value?: string | number | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0", className)}>
      <span className="text-xs font-medium text-muted-foreground w-36 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 text-sm text-foreground">
        {children ?? (value !== null && value !== undefined && value !== "" ? String(value) : <span className="text-muted-foreground/60">—</span>)}
      </div>
    </div>
  );
}

export function EditableField({
  label,
  isEditing,
  value,
  editValue,
  onEdit,
  onChange,
  type = "text",
  inputType,
  multiline,
  placeholder,
  className,
  display,
  children,
  editChildren,
}: {
  label?: string;
  isEditing: boolean;
  value?: string | number | null;
  editValue?: string;
  onEdit?: (v: string) => void;
  onChange?: (v: string) => void;
  type?: string;
  inputType?: string;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  display?: ReactNode;
  children?: ReactNode;
  editChildren?: ReactNode;
}) {
  const handleChange = onChange ?? onEdit;
  const inputVal = editValue ?? (value != null ? String(value) : "");
  const inputKind = inputType ?? type ?? "text";

  const inputEl = multiline ? (
    <textarea
      value={inputVal}
      onChange={e => handleChange?.(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className={cn(
        "w-full border border-[#F5821F] rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#F5821F] resize-y",
        className
      )}
    />
  ) : (
    <input
      type={inputKind}
      value={inputVal}
      onChange={e => handleChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full border border-[#F5821F] rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#F5821F]",
        className
      )}
    />
  );

  const displayNode = display ?? children ?? (
    value !== null && value !== undefined && value !== "" ? (
      String(value)
    ) : (
      <span className="text-muted-foreground/60">—</span>
    )
  );

  if (label) {
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
        <span className="text-xs font-medium text-muted-foreground w-36 shrink-0 pt-0.5">{label}</span>
        <div className="flex-1 text-sm">
          {isEditing ? (editChildren ?? inputEl) : displayNode}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 text-sm">
      {isEditing ? (editChildren ?? inputEl) : displayNode}
    </div>
  );
}
