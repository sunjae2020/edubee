import { useEffect } from "react";
import { setGlobalDateFormat } from "@/lib/date-format";

// camp.edubee.co is single-tenant — fixed DD/MM/YYYY format, no API call needed
export function useDateFormatLoader() {
  useEffect(() => {
    setGlobalDateFormat("DD/MM/YYYY");
  }, []);
}
