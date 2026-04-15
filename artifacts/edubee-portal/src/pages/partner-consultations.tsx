import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";

export default function PartnerConsultationsPage() {
  return (
    <ComingSoon
      title="Consultations"
      description="View consultation requests and enquiries related to your services from agents and students."
      icon={Users}
    />
  );
}
