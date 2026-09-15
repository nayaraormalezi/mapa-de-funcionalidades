import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "bg-[var(--muted)] text-[var(--foreground)]",
    success: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-900",
    danger: "bg-rose-50 text-rose-800",
    info: "bg-sky-50 text-sky-800",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
            {title}
          </CardTitle>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
          ) : null}
        </div>
        <div className={cn("rounded-lg p-2", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0" />
    </Card>
  );
}
