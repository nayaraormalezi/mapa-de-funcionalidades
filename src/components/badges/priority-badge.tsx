import { Badge } from "@/components/ui/badge";
import { priorityLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types";

const styles: Record<Priority, string> = {
  CRITICAL: "bg-rose-50 text-rose-800 ring-rose-200",
  HIGH: "bg-orange-50 text-orange-900 ring-orange-200",
  MEDIUM: "bg-amber-50 text-amber-900 ring-amber-200",
  LOW: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <Badge className={cn(styles[priority], className)}>
      {priorityLabel[priority]}
    </Badge>
  );
}
