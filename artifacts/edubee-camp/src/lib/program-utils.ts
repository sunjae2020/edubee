export type PublicPackage = {
  id: string;
  name: string;
  durationDays: number;
  displayPrice: number | null;
  displayCurrency: string;
  displaySymbol: string;
  displayFormatted: string | null;
  allPrices: Record<string, string | null>;
};

export type SpotGrade = {
  id: string;
  label: string;
  available: number;
  total: number;
  status: "available" | "limited" | "full";
};

export type PublicProgram = {
  id: string;
  nameEn: string;
  nameKo: string | null;
  nameJa: string | null;
  nameTh: string | null;
  descriptionEn: string | null;
  descriptionKo: string | null;
  descriptionJa: string | null;
  descriptionTh: string | null;
  thumbnailUrl: string | null;
  location: string | null;
  countryCode: string | null;
  primaryCurrency: string;
  primaryCurrencySymbol: string;
  countryFlag: string;
  interviewRequired: boolean;
  spotSummary: { grades: SpotGrade[] } | null;
  packages: PublicPackage[];
};

type LangKey = "en" | "ko" | "ja" | "th";

export function getLocalizedName(program: PublicProgram, lang: string): string {
  const l = lang as LangKey;
  return (
    (l === "ko" ? program.nameKo : l === "ja" ? program.nameJa : l === "th" ? program.nameTh : null) ||
    program.nameEn
  );
}

export function getLocalizedDesc(program: PublicProgram, lang: string): string {
  const l = lang as LangKey;
  return (
    (l === "ko" ? program.descriptionKo : l === "ja" ? program.descriptionJa : l === "th" ? program.descriptionTh : null) ||
    program.descriptionEn ||
    ""
  );
}

export function getLowestPackagePrice(program: PublicProgram): PublicPackage | null {
  if (!program.packages.length) return null;
  return program.packages.reduce((lowest, pkg) => {
    if (lowest === null) return pkg;
    if (!pkg.displayPrice) return lowest;
    if (!lowest.displayPrice) return pkg;
    return pkg.displayPrice < lowest.displayPrice ? pkg : lowest;
  }, null as PublicPackage | null);
}
