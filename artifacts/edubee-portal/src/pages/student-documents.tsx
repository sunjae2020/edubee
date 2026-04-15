import { ComingSoon } from "@/components/coming-soon";
import { FolderOpen } from "lucide-react";

export default function StudentDocumentsPage() {
  return (
    <ComingSoon
      title="My Documents"
      description="Access your enrolment letters, visa documents, and any files shared by your agent or institution."
      icon={FolderOpen}
    />
  );
}
