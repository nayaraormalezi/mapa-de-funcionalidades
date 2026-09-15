import { Badge } from "@/components/ui/badge";
import { temporalStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { TemporalStatus } from "@/types";

const styles: Record<TemporalStatus, string> = {
  CURRENT: "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent-ring)]",
  FUTURE: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  DEPRECATED: "bg-stone-100 text-stone-600 ring-stone-200",
};

export function ChannelBadge({
  name,
  temporalStatus,
  className,
}: {
  name: string;
  temporalStatus?: TemporalStatus;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        temporalStatus
          ? styles[temporalStatus]
          : "bg-slate-100 text-slate-700 ring-slate-200",
        className,
      )}
    >
      {name}
      {temporalStatus ? ` · ${temporalStatusLabel[temporalStatus]}` : null}
    </Badge>
  );
}
