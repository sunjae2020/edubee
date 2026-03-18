import { useTranslation } from "react-i18next";
import { X, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocalizedName, getLocalizedDesc, type PublicProgram, type SpotGrade } from "@/lib/program-utils";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  program: PublicProgram | null;
  onClose: () => void;
  onApply: (program: PublicProgram) => void;
};

function SpotStatusBadge({ status }: { status: SpotGrade["status"] }) {
  const map: Record<string, string> = {
    available: "bg-[#DCFCE7] text-[#16A34A] border-[#16A34A]/20",
    limited:   "bg-[#F5821F]/8 text-[#F5821F] border-[#F5821F]/20",
    full:      "bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/20",
  };
  const label: Record<string, string> = { available: "Open", limited: "Limited", full: "Full" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${map[status]}`}>
      {label[status]}
    </span>
  );
}

export function ProgramDetailDrawer({ program, onClose, onApply }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <AnimatePresence>
      {program && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-50 flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                {program.countryFlag && <span className="text-2xl">{program.countryFlag}</span>}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-[#F5821F]" />
                  {program.location}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Title & desc */}
              <div>
                <h2 className="font-bold text-xl text-foreground leading-snug">
                  {getLocalizedName(program, lang)}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {getLocalizedDesc(program, lang)}
                </p>
              </div>

              {/* Interview notice */}
              {program.interviewRequired && (
                <div className="flex gap-2.5 p-4 bg-[#F5821F]/6 border border-[#F5821F]/20 rounded-xl">
                  <Info className="w-4 h-4 text-[#F5821F] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm text-foreground">{t("programs.interviewRequired")}</div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      A brief video or in-person interview is required before enrollment confirmation.
                    </p>
                  </div>
                </div>
              )}

              {/* Packages table */}
              {program.packages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3">Available Packages</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground text-xs">
                          <th className="text-left px-4 py-2.5 font-semibold">Package</th>
                          <th className="text-center px-4 py-2.5 font-semibold">{t("programs.duration")}</th>
                          <th className="text-right px-4 py-2.5 font-semibold">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {program.packages.map((pkg) => (
                          <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground text-sm">{pkg.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground text-sm">
                              {pkg.durationDays} {t("programs.days")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {pkg.displayFormatted ? (
                                <span className="font-bold text-[#F5821F]">{pkg.displayFormatted}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {t("programs.priceNote")}
                  </p>
                </div>
              )}

              {/* Availability */}
              {program.spotSummary && (
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-3">{t("programs.availability")}</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground text-xs">
                          <th className="text-left px-4 py-2.5 font-semibold">Grade</th>
                          <th className="text-center px-4 py-2.5 font-semibold">Total</th>
                          <th className="text-center px-4 py-2.5 font-semibold">Available</th>
                          <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {program.spotSummary.grades.map((grade) => (
                          <tr key={grade.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{grade.label}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">{grade.total}</td>
                            <td className="px-4 py-3 text-center font-semibold text-foreground">{grade.available}</td>
                            <td className="px-4 py-3 text-center">
                              <SpotStatusBadge status={grade.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="px-5 py-4 border-t border-border shrink-0 bg-white">
              <Button
                className="w-full h-10 rounded-md font-semibold bg-[#F5821F] hover:bg-[#d97600] text-white"
                onClick={() => onApply(program)}
              >
                {t("programs.applyProgram")}
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
