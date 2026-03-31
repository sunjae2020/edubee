import { format, isValid } from "date-fns";

export const DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY  (31/03/2026)", token: "dd/MM/yyyy" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY  (03/31/2026)", token: "MM/dd/yyyy" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD  (2026-03-31)", token: "yyyy-MM-dd" },
  { value: "D MMM YYYY", label: "D MMM YYYY  (31 Mar 2026)", token: "d MMM yyyy" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD  (2026/03/31)", token: "yyyy/MM/dd" },
] as const;

export type DateFormatKey = typeof DATE_FORMAT_OPTIONS[number]["value"];

const DEFAULT: DateFormatKey = "DD/MM/YYYY";

let _fmt: DateFormatKey = DEFAULT;

export function setGlobalDateFormat(fmt: string) {
  const found = DATE_FORMAT_OPTIONS.find(o => o.value === fmt);
  if (found) _fmt = found.value;
}

export function getGlobalDateFormat(): DateFormatKey {
  return _fmt;
}

function toDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const parsed = typeof d === "string" ? new Date(d) : d;
  return isValid(parsed) ? parsed : null;
}

function getToken(): string {
  return DATE_FORMAT_OPTIONS.find(o => o.value === _fmt)?.token ?? "dd/MM/yyyy";
}

export function formatDate(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return "—";
  try { return format(dt, getToken()); } catch { return "—"; }
}

export function formatDateTime(d: Date | string | null | undefined): string {
  const dt = toDate(d);
  if (!dt) return "—";
  try { return format(dt, `${getToken()} HH:mm`); } catch { return "—"; }
}
