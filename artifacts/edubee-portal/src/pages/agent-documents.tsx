import { ComingSoon } from "@/components/coming-soon";
import { FolderOpen } from "lucide-react";

export default function AgentDocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="Access shared agreements, policies, and client-related documents in one centralised location."
      icon={FolderOpen}
    />
  );
}
