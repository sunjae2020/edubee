import { ComingSoon } from "@/components/coming-soon";
import { FileText } from "lucide-react";

export default function AgentQuotesPage() {
  return (
    <ComingSoon
      title="Quotes & Contracts"
      description="View and manage all quotes and contracts for your clients. Track acceptance status and contract details."
      icon={FileText}
    />
  );
}
