import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";

export default function StudentConsultationsPage() {
  return (
    <ComingSoon
      title="Consultations"
      description="View your consultation history and upcoming sessions with your education agent."
      icon={Users}
    />
  );
}
