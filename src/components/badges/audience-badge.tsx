import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AudienceCode } from "@/types";

const styles: Record<AudienceCode, string> = {
  CLIENT: "bg-[var(--brand-soft)] text-[var(--brand)] ring-[var(--brand-ring)]",
  ECONOMIARIO: "bg-teal-50 text-teal-900 ring-teal-200",
  PARTNER: "bg-amber-50 text-amber-950 ring-amber-200",
};

export function AudienceBadge({
  code,
  name,
  className,
}: {
  code: AudienceCode;
  name: string;
  className?: string;
}) {
  return <Badge className={cn(styles[code], className)}>{name}</Badge>;
}
