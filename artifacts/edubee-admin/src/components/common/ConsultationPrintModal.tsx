import { useEffect, useRef } from "react";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PrintSection {
  title: string;
  rows: { label: string; value?: string | number | boolean | string[] | null }[];
}

interface Props {
  title: string;
  refNumber?: string | null;
  status?: string | null;
  submittedVia?: string | null;
  date?: string | null;
  sections: PrintSection[];
  onClose: () => void;
}

function formatValue(value: string | number | boolean | string[] | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

export function ConsultationPrintModal({ title, refNumber, status, submittedVia, date, sections, onClose }: Props) {
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const printId = "consultation-print-area";

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body > *:not(#${printId}-portal) { display: none !important; }
        #${printId}-portal { display: block !important; position: fixed; inset: 0; z-index: 99999; background: white; }
        #${printId}-portal .no-print { display: none !important; }
        #${printId}-portal .print-content { padding: 24px; }
        @page { margin: 15mm; }
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => {
      if (styleRef.current) document.head.removeChild(styleRef.current);
    };
  }, []);

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  return (
    <div
      id={`${printId}-portal`}
      className="fixed inset-0 z-[9999] bg-white overflow-y-auto"
    >
      {/* Toolbar (no-print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b flex items-center justify-between px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span>{title}</span>
          {refNumber && <span className="text-gray-400">· {refNumber}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </Button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Print Content */}
      <div className="print-content max-w-3xl mx-auto py-10 px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#F5821F] uppercase tracking-widest">Edubee</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {refNumber && (
              <p className="text-sm text-gray-500 mt-1">Reference: <span className="font-semibold text-gray-700">{refNumber}</span></p>
            )}
          </div>
          <div className="text-right space-y-1">
            {status && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide block">Status</span>
                <span className="text-sm font-semibold capitalize text-gray-800">{status.replace("_", " ")}</span>
              </div>
            )}
            {date && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide block">Date</span>
                <span className="text-sm text-gray-800">{new Date(date).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            )}
            {submittedVia && (
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide block">Source</span>
                <span className="text-sm text-gray-800 capitalize">{submittedVia === "public" ? "Public Form" : "Admin"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-7">
          {sections.map((section, si) => (
            <div key={si}>
              <h2 className="text-xs font-bold text-[#F5821F] uppercase tracking-widest mb-3">{section.title}</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 bg-gray-50 rounded-lg p-4 border border-gray-100">
                {section.rows.map((row, ri) => (
                  <div key={ri} className={Array.isArray(row.value) && (row.value as string[]).length > 3 ? "col-span-2" : ""}>
                    <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{row.label}</dt>
                    <dd className="text-sm text-gray-800 mt-0.5">{formatValue(row.value)}</dd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Generated by Edubee CRM · {new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}
