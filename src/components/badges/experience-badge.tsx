/**
 * @deprecated Fase 11/14 — ExperienceLevel não é fonte de Health.
 * Preferir `HealthBadge` + healthScore/healthSignal de Evaluation.
 * Este componente permanece apenas se alguma tela legada ainda importar;
 * não usar em código novo.
 */
import { Badge } from "@/components/ui/badge";
import { experienceLabel } from "@/lib/labels";
import type { ExperienceLevel } from "@/types";

const styles: Record<ExperienceLevel, string> = {
  NOT_EVALUATED: "bg-slate-100 text-slate-700",
  GOOD: "bg-emerald-100 text-emerald-800",
  ADEQUATE: "bg-sky-100 text-sky-800",
  NEEDS_IMPROVEMENT: "bg-amber-100 text-amber-900",
  CRITICAL: "bg-rose-100 text-rose-800",
};

const dots: Record<ExperienceLevel, string> = {
  NOT_EVALUATED: "bg-slate-400",
  GOOD: "bg-emerald-500",
  ADEQUATE: "bg-sky-500",
  NEEDS_IMPROVEMENT: "bg-amber-500",
  CRITICAL: "bg-rose-500",
};

export function ExperienceBadge({
  experience,
}: {
  experience: ExperienceLevel;
}) {
  return (
    <Badge className={styles[experience]}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dots[experience]}`} />
      {experienceLabel[experience]}
    </Badge>
  );
}
