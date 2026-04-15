import { ComingSoon } from "@/components/coming-soon";
import { Wallet } from "lucide-react";

export default function PartnerFinancePage() {
  return (
    <ComingSoon
      title="Finance"
      description="View your commission payments, scheduled payouts, and financial history from Edubee."
      icon={Wallet}
    />
  );
}
