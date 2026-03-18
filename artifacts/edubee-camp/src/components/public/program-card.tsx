import { useTranslation } from "react-i18next";
import { MapPin, ClipboardList, ChevronRight } from "lucide-react";
import { getLocalizedName, getLocalizedDesc, getLowestPackagePrice, type PublicProgram } from "@/lib/program-utils";
import { Button } from "@/components/ui/button";

type Props = {
  program: PublicProgram;
  onViewDetails: (program: PublicProgram) => void;
};

const FALLBACK_IMAGES: Record<string, string> = {
  AU: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop",
  JP: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&auto=format&fit=crop",
  GB: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&auto=format&fit=crop",
  SG: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&auto=format&fit=crop",
  PH: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
  TH: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&auto=format&fit=crop",
  KR: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=600&auto=format&fit=crop",
  DEFAULT: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop",
};

function SpotBadge({ status, count }: { status: string; count: number }) {
  const { t } = useTranslation();
  if (status === "full") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        🔴 {t("programs.full")}
      </span>
    );
  }
  if (status === "limited") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        🟡 {t("programs.spotsLeft", { count })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      🟢 {t("programs.available")}
    </span>
  );
}

export function ProgramCard({ program, onViewDetails }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const name = getLocalizedName(program, lang);
  const desc = getLocalizedDesc(program, lang);
  const lowestPkg = getLowestPackagePrice(program);
  const img = program.thumbnailUrl || FALLBACK_IMAGES[program.countryCode ?? ""] || FALLBACK_IMAGES.DEFAULT;

  const overallSpotStatus = program.spotSummary
    ? program.spotSummary.grades.every((g) => g.status === "full")
      ? "full"
      : program.spotSummary.grades.some((g) => g.status === "limited")
      ? "limited"
      : "available"
    : null;
  const totalAvailable = program.spotSummary?.grades.reduce((s, g) => s + g.available, 0) ?? 0;

  return (
    <div className="group bg-card rounded-2xl border border-border/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES.DEFAULT; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
          <MapPin className="w-3 h-3" />
          {program.location}
        </div>
        {program.countryFlag && (
          <span className="absolute top-3 right-3 text-2xl">{program.countryFlag}</span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-display font-bold text-foreground text-lg leading-snug line-clamp-2">{name}</h3>
          {desc && <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{desc}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {program.interviewRequired && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50">
              <ClipboardList className="w-3 h-3" />
              {t("programs.interviewRequired")}
            </span>
          )}
          {program.spotSummary && overallSpotStatus && (
            <SpotBadge status={overallSpotStatus} count={totalAvailable} />
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
          <div>
            {lowestPkg?.displayFormatted ? (
              <div>
                <span className="text-xs text-muted-foreground">{t("programs.startingFrom")}</span>
                <div className="font-bold text-xl text-foreground">
                  {lowestPkg.displayFormatted}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {program.countryFlag}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full gap-1"
            onClick={() => onViewDetails(program)}
          >
            {t("programs.viewDetails")} <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
