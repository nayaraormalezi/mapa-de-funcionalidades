"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  insightSeverityLabel,
  type InsightSeverityCode,
} from "@/lib/labels";
import type { InsightOrigin } from "@/services/intelligence";

const ORIGIN_LABEL: Record<InsightOrigin, string> = {
  COVERAGE: "Cobertura",
  EXPERIENCE: "Experiência",
  COMPARISON: "Comparação",
  TRANSFORMATION: "Transformação",
  ROADMAP: "Gestão de entregas",
  MELHORIAS: "Melhorias",
  EVALUATION: "Avaliação",
};

const SEVERITY_TONE: Record<
  InsightSeverityCode,
  { badge: string; border: string }
> = {
  critical: {
    badge: "bg-rose-50 text-rose-800 ring-rose-200",
    border: "border-rose-200",
  },
  warning: {
    badge: "bg-amber-50 text-amber-900 ring-amber-200",
    border: "border-amber-200",
  },
  watch: {
    badge: "bg-sky-50 text-sky-900 ring-sky-200",
    border: "border-sky-200",
  },
  info: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    border: "border-[var(--border)]",
  },
};

export type InsightCardProps = {
  title: string;
  description?: string;
  severity?: InsightSeverityCode;
  origin?: InsightOrigin;
  context?: string;
  href?: string;
  actionLabel?: string;
  metric?: string;
  className?: string;
};

/**
 * Card reutilizável de Insight (camada transversal de Inteligência).
 * Insight ≠ Lacuna/Problema/Oportunidade — não cria melhoria automaticamente.
 */
export function InsightCard({
  title,
  description,
  severity = "info",
  origin,
  context,
  href,
  actionLabel = "Investigar",
  metric,
  className,
}: InsightCardProps) {
  const tone = SEVERITY_TONE[severity] ?? SEVERITY_TONE.info;

  return (
    <article
      className={cn(
        "rounded-xl border bg-white px-4 py-3.5 shadow-[var(--shadow-sm)]",
        tone.border,
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ring-1 uppercase",
            tone.badge,
          )}
        >
          {insightSeverityLabel[severity]}
        </span>
        {origin ? (
          <span className="text-[10px] font-medium tracking-wide text-slate-500 uppercase">
            Origem: {ORIGIN_LABEL[origin]}
          </span>
        ) : null}
        {metric ? (
          <span className="ml-auto text-xs font-semibold tabular-nums text-slate-600">
            {metric}
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {description}
        </p>
      ) : null}
      {context ? (
        <p className="mt-1.5 text-[11px] text-slate-500">{context}</p>
      ) : null}
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </article>
  );
}

export function InsightsFoundSection({
  title = "Insights encontrados",
  insights,
  emptyMessage = "Nenhum insight identificado neste contexto.",
}: {
  title?: string;
  insights: InsightCardProps[];
  emptyMessage?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {insights.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight, i) => (
            <InsightCard
              key={`${insight.title}-${i}`}
              {...insight}
            />
          ))}
        </div>
      )}
    </section>
  );
}
