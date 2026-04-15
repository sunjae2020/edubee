import { LucideIcon, Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "var(--e-orange-lt)" }}
      >
        {Icon
          ? <Icon size={26} style={{ color: "var(--e-orange)" }} />
          : <Construction size={26} style={{ color: "var(--e-orange)" }} />
        }
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: "var(--e-text-1)" }}>
        {title}
      </h2>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--e-text-3)" }}>
        {description ?? "This section is under development and will be available soon."}
      </p>
      <div
        className="mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: "var(--e-orange-lt)", color: "var(--e-orange)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--e-orange)" }} />
        Coming Soon
      </div>
    </div>
  );
}
