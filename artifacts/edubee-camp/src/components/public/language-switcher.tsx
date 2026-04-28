import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇦🇺" },
  { code: "ko", label: "Korean",     flag: "🇰🇷" },
  { code: "ja", label: "日本語",     flag: "🇯🇵" },
  { code: "th", label: "ภาษาไทย",   flag: "🇹🇭" },
];

export function LanguageSwitcher({ variant = "default" }: { variant?: "default" | "footer" }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isFooter = variant === "footer";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-md border text-sm font-medium transition-colors ${
          isFooter
            ? "px-3 py-1.5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
            : "px-2.5 py-1.5 border-border bg-white hover:bg-muted text-foreground"
        }`}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border bg-white shadow-md z-50 overflow-hidden py-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                lang.code === i18n.language
                  ? "bg-(--e-orange)/8 text-(--e-orange) font-semibold"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
