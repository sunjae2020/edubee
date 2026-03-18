import { useTranslation } from "react-i18next";
import { X, MapPin, ClipboardList, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocalizedName, getLocalizedDesc, type PublicProgram, type SpotGrade } from "@/lib/program-utils";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  program: PublicProgram | null;
  onClose: () => void;
  onApply: (program: PublicProgram) => void;
};

function SpotStatusBadge({ status }: { status: SpotGrade["status"] }) {
  const map = {
    available: { emoji: "🟢", cls: "text-green-700 bg-green-50 border-green-200" },
    limited: { emoji: "🟡", cls: "text-amber-700 bg-amber-50 border-amber-200" },
    full: { emoji: "🔴", cls: "text-red-700 bg-red-50 border-red-200" },
  };
  const { emoji, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {emoji}
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-background shadow-2xl z-50 flex flex-col overflow-hidden"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{program.countryFlag}</span>
                <div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {program.location}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl text-foreground leading-snug">
                  {getLocalizedName(program, lang)}
                </h2>
                <p className="text-muted-foreground mt-3 leading-relaxed text-sm">
                  {getLocalizedDesc(program, lang)}
                </p>
              </div>

              {/* Interview required */}
              {program.interviewRequired && (
                <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-800 text-sm flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4" />
                      {t("programs.interviewRequired")}
                    </div>
                    <p className="text-blue-700 text-xs mt-1">
                      A brief video or in-person interview is required before enrollment confirmation.
                    </p>
                  </div>
                </div>
              )}

              {/* Packages table */}
              {program.packages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Available Packages</h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 text-muted-foreground">
                          <th className="text-left px-4 py-2.5 font-medium">Package</th>
                          <th className="text-center px-4 py-2.5 font-medium">{t("programs.duration")}</th>
                          <th className="text-right px-4 py-2.5 font-medium">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {program.packages.map((pkg) => (
                          <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground">{pkg.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">
                              {pkg.durationDays} {t("programs.days")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {pkg.displayFormatted ? (
                                <span className="font-bold text-foreground">
                                  {pkg.displayFormatted}{" "}
                                  <span className="text-muted-foreground font-normal">{program.countryFlag}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {t("programs.priceNote")}
                  </p>
                </div>
              )}

              {/* Enrollment availability */}
              {program.spotSummary && (
                <div>
                  <h3 className="font-semibold text-foreground mb-3">{t("programs.availability")}</h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 text-muted-foreground">
                          <th className="text-left px-4 py-2.5 font-medium">Grade</th>
                          <th className="text-center px-4 py-2.5 font-medium">Cap.</th>
                          <th className="text-center px-4 py-2.5 font-medium">Available</th>
                          <th className="text-center px-4 py-2.5 font-medium">Status</th>
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
            <div className="p-6 border-t border-border shrink-0">
              <Button
                className="w-full h-12 rounded-full font-semibold shadow-lg shadow-primary/20"
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
