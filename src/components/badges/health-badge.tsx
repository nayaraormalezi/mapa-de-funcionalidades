"use client";

import { Badge } from "@/components/ui/badge";
import {
  HEALTH_BUCKET_LABEL,
  healthSignal,
  healthToBucket,
  SIGNAL_LABEL,
  type SignalLevel,
} from "@/lib/health";
import { cn } from "@/lib/utils";

const styles: Record<SignalLevel, string> = {
  UNKNOWN: "bg-slate-100 text-slate-600 ring-slate-200",
  GOOD: "bg-emerald-50 text-emerald-800 ring-emerald-100",
  ATTENTION: "bg-amber-50 text-amber-900 ring-amber-100",
  CRITICAL: "bg-rose-50 text-rose-800 ring-rose-100",
};

const dots: Record<SignalLevel, string> = {
  UNKNOWN: "bg-slate-400",
  GOOD: "bg-emerald-500",
  ATTENTION: "bg-amber-500",
  CRITICAL: "bg-rose-500",
};

/**
 * Badge de Health canônico (derivado de Evaluation).
 * score null → "Não avaliada" (≠ ruim / ≠ 0).
 */
export function HealthBadge({
  score,
  signal,
  className,
}: {
  score: number | null;
  signal?: SignalLevel;
  className?: string;
}) {
  const level = signal ?? healthSignal(score);
  const bucket = healthToBucket(score, level);

  return (
    <Badge
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[level],
        className,
      )}
      title={
        score == null
          ? "Sem Evaluation válida — não equivale a score 0 nem a oportunidade."
          : `Saúde ${score}/100 (${SIGNAL_LABEL[level]})`
      }
    >
      <span
        className={cn(
          "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
          dots[level],
        )}
      />
      {bucket === "NOT_EVALUATED"
        ? HEALTH_BUCKET_LABEL.NOT_EVALUATED
        : `${score} · ${SIGNAL_LABEL[level]}`}
    </Badge>
  );
}
