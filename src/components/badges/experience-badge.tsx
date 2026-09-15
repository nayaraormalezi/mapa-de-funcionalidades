import { Badge } from "@/components/ui/badge";
import { experienceLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ExperienceLevel } from "@/types";

const styles: Record<ExperienceLevel, string> = {
  NOT_EVALUATED: "bg-slate-100 text-slate-600 ring-slate-200",
  GOOD: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  ADEQUATE: "bg-teal-50 text-teal-800 ring-teal-100",
  NEEDS_IMPROVEMENT: "bg-amber-50 text-amber-900 ring-amber-100",
  CRITICAL: "bg-rose-50 text-rose-800 ring-rose-100",
};

const dots: Record<ExperienceLevel, string> = {
  NOT_EVALUATED: "bg-slate-400",
  GOOD: "bg-emerald-500",
  ADEQUATE: "bg-teal-500",
  NEEDS_IMPROVEMENT: "bg-amber-500",
  CRITICAL: "bg-rose-500",
};

export function ExperienceBadge({
  experience,
  className,
}: {
  experience: ExperienceLevel;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[experience],
        className,
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
          dots[experience],
        )}
      />
      {experienceLabel[experience]}
    </Badge>
  );
}
