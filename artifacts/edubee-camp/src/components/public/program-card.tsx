import { useTranslation } from "react-i18next";
import { MapPin, ChevronRight } from "lucide-react";
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 text-red-600 border border-red-100">
        {t("programs.full")}
      </span>
    );
  }
  if (status === "limited") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[#F08301]/8 text-[#F08301] border border-[#F08301]/20">
        {t("programs.spotsLeft", { count })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-100">
      {t("programs.available")}
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
    <div className="group bg-white rounded-xl border border-border hover:border-[#F08301]/40 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={img}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES.DEFAULT; }}
        />
        {/* Location badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 text-foreground text-xs font-medium px-2 py-1 rounded-md">
          <MapPin className="w-3 h-3 text-[#F08301]" />
          {program.location}
        </div>
        {program.countryFlag && (
          <span className="absolute top-3 right-3 text-xl">{program.countryFlag}</span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-bold text-foreground text-base leading-snug line-clamp-2">{name}</h3>
          {desc && <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2 leading-relaxed">{desc}</p>}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {program.interviewRequired && (
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
              Interview Required
            </span>
          )}
          {program.spotSummary && overallSpotStatus && (
            <SpotBadge status={overallSpotStatus} count={totalAvailable} />
          )}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
          <div>
            {lowestPkg?.displayFormatted ? (
              <div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("programs.startingFrom")}</div>
                <div className="font-extrabold text-lg text-[#F08301] leading-tight">{lowestPkg.displayFormatted}</div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-md gap-1 h-8 px-3 text-xs font-semibold text-[#F08301] hover:bg-[#F08301]/8 hover:text-[#F08301]"
            onClick={() => onViewDetails(program)}
          >
            {t("programs.viewDetails")} <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
