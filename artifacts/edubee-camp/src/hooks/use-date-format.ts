import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { setGlobalDateFormat } from "@/lib/date-format";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function useDateFormatLoader() {
  const { data } = useQuery({
    queryKey: ["settings-display"],
    queryFn: () => axios.get(`${BASE}/api/settings/display`).then(r => r.data),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (data?.dateFormat) {
      setGlobalDateFormat(data.dateFormat);
    }
  }, [data]);
}
