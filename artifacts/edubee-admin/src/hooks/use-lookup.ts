import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LookupItem {
  id: string;
  group: string;
  label: string;
  status: string;
  sortOrder: number;
}

const FALLBACKS: Record<string, string[]> = {
  account_type:    ["Student", "Client", "Company", "School", "Sub_Agency", "Super_Agency", "Supplier", "Staff", "Branch", "Agent", "Provider", "Organisation"],
  account_category:["VIP", "General", "New", "Alumni", "Corporate", "Government", "NGO", "Individual", "Group"],
  contact_type:    ["Student", "Organisation", "Agent", "School", "Staff", "Other"],
  influx_channel:  ["Website", "Referral", "Social Media", "Email", "Phone", "Agent", "Walk-in", "Other"],
  sns_type:        ["WeChat", "WhatsApp", "LINE", "KakaoTalk", "Instagram", "Facebook", "Telegram", "Other"],
  inquiry_type:    ["Summer Camp", "Study Abroad", "Internship", "Accommodation", "Guardian", "Other"],
  nationality:     ["Korean", "Chinese", "Japanese", "Thai", "Vietnamese", "Indonesian", "Filipino", "Singaporean", "Australian", "Other"],
  language:        ["Korean", "English", "Chinese", "Japanese", "Thai", "Vietnamese", "Spanish", "French", "Other"],
  visa_type:       ["Student Visa", "Working Holiday", "Tourist", "Business", "Dependent", "Other"],
  product_unit:    ["per package", "per person", "per night", "per day", "per session", "per trip", "per group", "per week", "per transfer", "per meal", "per semester", "per annual", "per course", "flat fee"],
};

export function useLookup(group: string): string[] {
  const { data } = useQuery<LookupItem[]>({
    queryKey: ["lookups", group, "active"],
    queryFn: () =>
      axios
        .get(`${BASE}/api/settings/lookups?group=${group}`)
        .then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.length === 0) return FALLBACKS[group] ?? [];
  return data.map(item => item.label);
}
