import { Badge } from "@/components/ui/badge";
import { featureStatusLabel, normalizeDeadlineStatus } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { FeatureStatus } from "@/types";

const styles: Record<FeatureStatus, string> = {
  ON_TRACK: "bg-[#eaf5d8] text-[#406c3d] ring-[#eaf5d8]",
  DELAYED: "bg-[#fce5df] text-[#8c2f1e] ring-[#fce5df]",
  NO_DEADLINE: "bg-slate-100 text-slate-600 ring-slate-200",
};

const dots: Record<FeatureStatus, string> = {
  ON_TRACK: "bg-[#a6ce39]",
  DELAYED: "bg-[#dc2626]",
  NO_DEADLINE: "bg-slate-400",
};

export function StatusBadge({
  status,
  className,
}: {
  status: FeatureStatus | string;
  className?: string;
}) {
  const normalized = normalizeDeadlineStatus(status);
  return (
    <Badge
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[normalized],
        className,
      )}
    >
      <span
        className={cn(
          "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
          dots[normalized],
        )}
      />
      {featureStatusLabel[normalized]}
    </Badge>
  );
}
