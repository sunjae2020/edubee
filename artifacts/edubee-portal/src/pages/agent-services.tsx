import { ComingSoon } from "@/components/coming-soon";
import { Package } from "lucide-react";

export default function AgentServicesPage() {
  return (
    <ComingSoon
      title="Services"
      description="Browse and manage education services available for your clients including courses, accommodation, and transport."
      icon={Package}
    />
  );
}
