import { Badge } from "@/components/ui/badge";
import {
  featureStatusLabel,
  normalizeFeatureStatus,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { FeatureStatus } from "@/types";

const styles: Record<FeatureStatus, string> = {
  BACKLOG: "bg-[#cff0fb] text-[#006d8f] ring-[#cff0fb]",
  UX_UI: "bg-[#f8eef5] text-[#b26f9b] ring-[#f8eef5]",
  DEVELOPMENT: "bg-[#fde8c8] text-[#844200] ring-[#fde8c8]",
  HOMOLOGATION: "bg-[#fef0d4] text-[#98522d] ring-[#fef0d4]",
  PAUSED: "bg-[#e8f1fa] text-[#145fab] ring-[#e8f1fa]",
  REMOVED: "bg-stone-100 text-stone-600 ring-stone-200",
  AVAILABLE: "bg-[#eaf5d8] text-[#406c3d] ring-[#eaf5d8]",
};

const dots: Record<FeatureStatus, string> = {
  BACKLOG: "bg-[#00b5e5]",
  UX_UI: "bg-[#b26f9b]",
  DEVELOPMENT: "bg-[#f39300]",
  HOMOLOGATION: "bg-[#f8b019]",
  PAUSED: "bg-[#145fab]",
  REMOVED: "bg-stone-400",
  AVAILABLE: "bg-[#a6ce39]",
};

export function StatusBadge({
  status,
  className,
}: {
  status: FeatureStatus | string;
  className?: string;
}) {
  const normalized = normalizeFeatureStatus(status);
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
