import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { buildFullName } from "@/lib/nameUtils";

type FieldKey = string;

interface NameFieldGroupProps {
  values: {
    firstName:    string;
    lastName:     string;
    englishName?: string;
    originalName?: string;
  };
  onChange: (key: FieldKey, value: string) => void;
  prefix?:  string;
  required?: boolean;
  showEnglishName?:  boolean;
  showOriginalName?: boolean;
  disabled?: boolean;
}

function fkey(prefix: string | undefined, base: string): string {
  if (!prefix) return base;
  return prefix + base.charAt(0).toUpperCase() + base.slice(1);
}

export function NameFieldGroup({
  values,
  onChange,
  prefix,
  required = false,
  showEnglishName  = true,
  showOriginalName = true,
  disabled = false,
}: NameFieldGroupProps) {
  const preview = buildFullName(
    { firstName: values.firstName, lastName: values.lastName },
    ""
  );
  const originalPreview = values.originalName?.trim() || "";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#57534E]">
            First Name {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            className="h-9 text-sm"
            placeholder="e.g. Jason"
            value={values.firstName}
            onChange={e => onChange(fkey(prefix, "firstName"), e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#57534E]">
            Last Name {required && <span className="text-red-500">*</span>}
            <span className="text-[10px] text-[#A8A29E] ml-1">(auto-capitalized when displayed)</span>
          </Label>
          <Input
            className="h-9 text-sm"
            placeholder="e.g. Kim"
            value={values.lastName}
            onChange={e => onChange(fkey(prefix, "lastName"), e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      {showOriginalName && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#57534E]">
            Original Name <span className="text-[10px] text-[#A8A29E]">(native script – optional)</span>
          </Label>
          <Input
            className="h-9 text-sm"
            placeholder="e.g. 김민준"
            value={values.originalName ?? ""}
            onChange={e => onChange(fkey(prefix, "originalName"), e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {showEnglishName && (
        <div className="space-y-1">
          <Label className="text-xs font-medium text-[#57534E]">
            English Nickname <span className="text-[10px] text-[#A8A29E]">(optional)</span>
          </Label>
          <Input
            className="h-9 text-sm"
            placeholder="e.g. Jay"
            value={values.englishName ?? ""}
            onChange={e => onChange(fkey(prefix, "englishName"), e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {(preview || originalPreview) && (
        <div className="px-3 py-2 rounded-lg bg-(--e-orange-lt) border border-(--e-orange)/20">
          <p className="text-[10px] text-[#A8A29E] mb-0.5">Preview</p>
          {preview && (
            <p className="text-sm font-semibold text-[#1C1917] leading-tight">
              {values.firstName} {values.lastName?.toUpperCase()}
            </p>
          )}
          {originalPreview && (
            <p className="text-xs text-[#57534E]">{originalPreview}</p>
          )}
        </div>
      )}
    </div>
  );
}
