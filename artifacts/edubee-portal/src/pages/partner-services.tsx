import { ComingSoon } from "@/components/coming-soon";
import { Package } from "lucide-react";

export default function PartnerServicesPage() {
  return (
    <ComingSoon
      title="Services"
      description="Manage and update the services you provide, including availability, pricing, and service details."
      icon={Package}
    />
  );
}
