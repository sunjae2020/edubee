import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LS_CURRENCY = "edubee_display_currency";
const LS_RATES = "edubee_exchange_rates";
const LS_RATES_TS = "edubee_rates_timestamp";
const CACHE_TTL = 3_600_000; // 1 hour

export type RateEntry = { rate: number; inverse: number };

export interface DisplayCurrencyContextValue {
  displayCurrency: string;
  setDisplayCurrency: (c: string) => void;
  rates: Record<string, RateEntry>;
  ratesUpdatedAt: string;
  isLoading: boolean;
  convertPrice: (amount: number, fromCurrency: string, toCurrency: string) => number;
  formatReference: (amount: number, fromCurrency: string) => string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  KRW: "₩", JPY: "¥", THB: "฿", PHP: "₱",
  USD: "$", SGD: "S$", GBP: "£", AUD: "A$", EUR: "€",
};

const DECIMAL_CURRENCIES = new Set(["USD", "SGD", "GBP", "AUD", "EUR"]);

export function formatCurrencyAmount(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  if (DECIMAL_CURRENCIES.has(currency)) {
    return `${sym}${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sym}${Math.round(amount).toLocaleString()}`;
}

function detectDefaultCurrency(): string {
  const lang = navigator.language || "en";
  if (lang.startsWith("ko")) return "KRW";
  if (lang.startsWith("ja")) return "JPY";
  if (lang.startsWith("th")) return "THB";
  if (lang === "en-AU" || lang === "en-NZ") return "AUD";
  return "USD";
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(() => {
    return localStorage.getItem(LS_CURRENCY) || detectDefaultCurrency();
  });
  const [rates, setRates] = useState<Record<string, RateEntry>>({ AUD: { rate: 1, inverse: 1 } });
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const setDisplayCurrency = useCallback((c: string) => {
    setDisplayCurrencyState(c);
    localStorage.setItem(LS_CURRENCY, c);
  }, []);

  // Fetch rates (with localStorage cache)
  useEffect(() => {
    const tryLoad = async () => {
      try {
        const cached = localStorage.getItem(LS_RATES);
        const cachedTs = localStorage.getItem(LS_RATES_TS);
        if (cached && cachedTs && Date.now() - Number(cachedTs) < CACHE_TTL) {
          const parsed = JSON.parse(cached);
          setRates(parsed.rates);
          setRatesUpdatedAt(parsed.updatedAt ?? "");
          setIsLoading(false);
          return;
        }
      } catch { /* ignore */ }

      try {
        const { data } = await axios.get(`${BASE}/api/public/exchange-rates`);
        if (data.success && data.rates) {
          setRates(data.rates);
          setRatesUpdatedAt(data.updatedAt ?? "");
          localStorage.setItem(LS_RATES, JSON.stringify({ rates: data.rates, updatedAt: data.updatedAt }));
          localStorage.setItem(LS_RATES_TS, String(Date.now()));
        }
      } catch { /* use fallback rates */ } finally {
        setIsLoading(false);
      }
    };
    tryLoad();
  }, []);

  const convertPrice = useCallback((amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    if (!fromRate || !toRate) return amount;
    // Step 1: Convert to AUD
    const inAUD = fromCurrency === "AUD" ? amount : amount * fromRate.rate;
    // Step 2: Convert from AUD to target
    const result = toCurrency === "AUD" ? inAUD : inAUD / toRate.rate;
    return Math.round(result);
  }, [rates]);

  const formatReference = useCallback((amount: number, fromCurrency: string): string | null => {
    if (fromCurrency === displayCurrency) return null;
    const converted = convertPrice(amount, fromCurrency, displayCurrency);
    return `≈ ${formatCurrencyAmount(converted, displayCurrency)}`;
  }, [displayCurrency, convertPrice]);

  return (
    <DisplayCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, rates, ratesUpdatedAt, isLoading, convertPrice, formatReference }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) throw new Error("useDisplayCurrency must be used inside DisplayCurrencyProvider");
  return ctx;
}
