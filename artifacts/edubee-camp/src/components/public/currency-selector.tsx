import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDisplayCurrency } from "@/context/DisplayCurrencyContext";
import { ChevronDown, Check } from "lucide-react";

const CURRENCIES = [
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "USD", flag: "🇺🇸", name: "US Dollar" },
  { code: "KRW", flag: "🇰🇷", name: "Korean Won" },
  { code: "JPY", flag: "🇯🇵", name: "Japanese Yen" },
  { code: "THB", flag: "🇹🇭", name: "Thai Baht" },
  { code: "PHP", flag: "🇵🇭", name: "Philippine Peso" },
  { code: "SGD", flag: "🇸🇬", name: "Singapore Dollar" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
];

export function CurrencySelector({ variant = "default" }: { variant?: "default" | "mobile" }) {
  const { t } = useTranslation();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = CURRENCIES.find(c => c.code === displayCurrency) ?? CURRENCIES[0];

  if (variant === "mobile") {
    return (
      <div className="space-y-1 px-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-1">
          {t("currency.selector_label", "My Currency")}
        </p>
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            onClick={() => setDisplayCurrency(c.code)}
            className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              c.code === displayCurrency ? "bg-[#FEF0E3] text-[#F5821F] font-semibold" : "text-foreground hover:bg-muted"
            }`}
          >
            <span>{c.flag}</span>
            <span>{c.code}</span>
            <span className="text-muted-foreground text-xs ml-auto">{c.name}</span>
            {c.code === displayCurrency && <Check className="w-3.5 h-3.5 text-[#F5821F] shrink-0" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#57534E] bg-white border border-[#E8E6E2] rounded-lg hover:border-[#F5821F] hover:text-[#F5821F] transition-colors"
        aria-label="Select currency"
      >
        <span className="text-base leading-none">💱</span>
        <span>{current.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b">
            <p className="text-[11px] font-semibold text-[#A8A29E] uppercase tracking-wide">
              💱 {t("currency.selector_label", "My Currency")} (참고용)
            </p>
          </div>
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => { setDisplayCurrency(c.code); setOpen(false); }}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                c.code === displayCurrency ? "bg-[#FEF0E3] text-[#F5821F] font-semibold" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="font-medium w-10">{c.code}</span>
              <span className={`text-xs flex-1 ${c.code === displayCurrency ? "text-[#F5821F]/70" : "text-muted-foreground"}`}>{c.name}</span>
              {c.code === displayCurrency && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
