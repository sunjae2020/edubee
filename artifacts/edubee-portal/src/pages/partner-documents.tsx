import { ComingSoon } from "@/components/coming-soon";
import { FolderOpen } from "lucide-react";

export default function PartnerDocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="Access contracts, service agreements, and any documents shared by the Edubee team."
      icon={FolderOpen}
    />
  );
}
