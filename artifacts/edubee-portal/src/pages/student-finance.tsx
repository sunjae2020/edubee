import { ComingSoon } from "@/components/coming-soon";
import { Wallet } from "lucide-react";

export default function StudentFinancePage() {
  return (
    <ComingSoon
      title="Finance"
      description="Track your tuition payments, invoices, and outstanding balances for your enrolled programs."
      icon={Wallet}
    />
  );
}
