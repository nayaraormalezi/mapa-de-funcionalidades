import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MomentCode } from "@/types";

const styles: Record<MomentCode, string> = {
  SALE: "bg-[var(--brand-soft)] text-[var(--brand)] ring-[var(--brand-ring)]",
  AFTER_SALE: "bg-slate-100 text-slate-800 ring-slate-200",
};

export function MomentBadge({
  code,
  name,
  className,
}: {
  code: MomentCode;
  name: string;
  className?: string;
}) {
  return <Badge className={cn(styles[code], className)}>{name}</Badge>;
}
