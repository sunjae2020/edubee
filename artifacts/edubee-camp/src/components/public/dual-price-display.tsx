import { useDisplayCurrency, formatCurrencyAmount } from "@/context/DisplayCurrencyContext";

const COUNTRY_FLAG: Record<string, string> = {
  AU: "🇦🇺", PH: "🇵🇭", SG: "🇸🇬", TH: "🇹🇭",
  KR: "🇰🇷", JP: "🇯🇵", GB: "🇬🇧", US: "🇺🇸",
};

interface Props {
  localAmount: number | null;
  localCurrency: string;
  countryCode?: string | null;
  size?: "card" | "detail";
}

export function DualPriceDisplay({ localAmount, localCurrency, countryCode, size = "card" }: Props) {
  const { formatReference } = useDisplayCurrency();

  if (localAmount == null) return <span className="text-sm text-muted-foreground">—</span>;

  const localFormatted = formatCurrencyAmount(localAmount, localCurrency);
  const referenceText = formatReference(localAmount, localCurrency);
  const flag = countryCode ? COUNTRY_FLAG[countryCode] : null;

  return (
    <div>
      <div className={`font-extrabold leading-tight flex items-center gap-1.5 ${size === "detail" ? "text-2xl" : "text-lg"} text-[#F5821F]`}>
        <span>{localFormatted}</span>
        {flag && <span className="text-base">{flag}</span>}
      </div>
      {referenceText && (
        <div className="text-[11px] text-[#A8A29E] italic mt-0.5">
          {referenceText} <span className="not-italic">참고용</span>
        </div>
      )}
    </div>
  );
}
