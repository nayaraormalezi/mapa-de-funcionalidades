import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 rounded-full bg-[var(--muted)] p-3 text-[var(--muted-foreground)]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
        {title}
      </h3>
      <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
