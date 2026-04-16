import { BookOpen } from "lucide-react";

const ORANGE = "#F5821F";

export default function PartnerContractsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-20 rounded-xl border" style={{ background: "#FFFFFF", borderColor: "#E8E6E2" }}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "#FEF0E3" }}>
          <BookOpen size={24} style={{ color: ORANGE }} />
        </div>
        <p className="text-base font-semibold" style={{ color: "#1C1917" }}>Service Contracts</p>
        <p className="text-sm mt-2 max-w-xs mx-auto" style={{ color: "#A8A29E" }}>
          Your service agreements and partnership contracts will appear here.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: "#FEF0E3", color: ORANGE }}>
          Coming Soon
        </div>
      </div>
    </div>
  );
}
