import { useEffect } from "react";
import { setGlobalDateFormat } from "@/lib/date-format";

// camp.edubee.co 는 싱글 테넌트 — DD/MM/YYYY 고정, API 호출 불필요
export function useDateFormatLoader() {
  useEffect(() => {
    setGlobalDateFormat("DD/MM/YYYY");
  }, []);
}
