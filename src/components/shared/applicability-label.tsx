import { formatApplicabilityLabel } from "@/lib/products";
import { cn } from "@/lib/utils";

/** Indicador compacto de aplicabilidade por produto. */
export function ApplicabilityLabel({
  productIds,
  className,
}: {
  productIds?: string[] | null;
  className?: string;
}) {
  const label = formatApplicabilityLabel(productIds);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600",
        className,
      )}
      title={label}
    >
      {label}
    </span>
  );
}
