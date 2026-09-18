"use client";

import { useEffect, useMemo, useRef } from "react";
import { SurfaceCard } from "@/components/ui/prototype";
import {
  evolutionPhaseLabel,
  featureStageLabel,
  temporalStatusLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  activeEvolutions,
  formatMonthYear,
  groupByFeatureThenProduct,
  type FeatureEvolution,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";
import type { FeatureStage } from "@/types";

const STAGE_BAR: Record<FeatureStage, string> = {
  BACKLOG: "bg-[var(--brand)]",
  UX_UI: "bg-violet-400",
  DEVELOPMENT: "bg-amber-400",
  HOMOLOGATION: "bg-orange-400",
  PAUSED: "bg-slate-400",
  REMOVED: "bg-stone-400",
  AVAILABLE: "bg-emerald-500",
};

const COL = 92;
const LABEL = 300;
/** Meses futuros além do mês atual (para scroll à frente). */
const FUTURE_BUFFER = 6;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function quarterOf(d: Date) {
  return Math.floor(d.getMonth() / 3) + 1;
}

function quarterKey(d: Date) {
  return `${d.getFullYear()}-Q${quarterOf(d)}`;
}

/** Agrupa meses consecutivos em blocos de quarter/ano para o cabeçalho. */
function buildQuarterGroups(months: { key: string; date: Date }[]) {
  const groups: {
    key: string;
    label: string;
    year: number;
    quarter: number;
    span: number;
  }[] = [];

  for (const m of months) {
    const key = quarterKey(m.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.span += 1;
      continue;
    }
    const q = quarterOf(m.date);
    groups.push({
      key,
      year: m.date.getFullYear(),
      quarter: q,
      label: `Q${q} ${m.date.getFullYear()}`,
      span: 1,
    });
  }

  return groups;
}

function buildMonths(items: RoadmapImpl[]) {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let start = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Inclui lançamentos antigos no scroll à esquerda (disponíveis).
  for (const item of items) {
    if (item.phase !== "AVAILABLE" || !item.launchDate) continue;
    const launch = new Date(item.launchDate);
    if (Number.isNaN(launch.getTime())) continue;
    const launchMonth = new Date(launch.getFullYear(), launch.getMonth(), 1);
    if (launchMonth < start) start = launchMonth;
  }

  // Também olha datas de início/previsão de itens em andamento.
  for (const item of items) {
    for (const raw of [item.startDate, item.expectedDate]) {
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const m = new Date(d.getFullYear(), d.getMonth(), 1);
      if (m < start) start = m;
    }
  }

  const earliestAllowed = new Date(now.getFullYear(), now.getMonth() - 35, 1);
  if (start < earliestAllowed) start = earliestAllowed;

  const endMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + FUTURE_BUFFER,
    1,
  );
  const length =
    (endMonth.getFullYear() - start.getFullYear()) * 12 +
    (endMonth.getMonth() - start.getMonth()) +
    1;

  return Array.from({ length: Math.max(length, 8) }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const label = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .toUpperCase();
    return { key: monthKey(d), label, date: d };
  });
}

function barFromDates(
  startRaw: string | null,
  endRaw: string | null,
  months: { key: string; date: Date }[],
  fallbackFull?: boolean,
): { start: number; span: number } | null {
  if (months.length === 0) return null;
  const first = months[0].date;
  const last = months[months.length - 1].date;

  const parseMonth = (raw: string | null) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  let start = parseMonth(startRaw);
  let end = parseMonth(endRaw);

  if (!start && !end) {
    if (fallbackFull) {
      start = first;
      const nowM = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      end = nowM > last ? last : nowM < first ? first : nowM;
    } else {
      return null;
    }
  }

  if (!start) start = end!;
  if (!end) end = start;
  if (end < start) end = start;

  const clamp = (d: Date) => {
    if (d < first) return first;
    if (d > last) return last;
    return d;
  };

  const s = clamp(start);
  const e = clamp(end);
  const startIdx = months.findIndex((m) => m.key === monthKey(s));
  const endIdx = months.findIndex((m) => m.key === monthKey(e));
  if (startIdx < 0 || endIdx < 0) return null;
  return { start: startIdx, span: Math.max(1, endIdx - startIdx + 1) };
}

export function RoadmapTimelineView({
  items,
  onOpenFeature,
  onOpenEvolution,
}: {
  items: RoadmapImpl[];
  onOpenFeature: (featureId: string) => void;
  onOpenEvolution: (item: RoadmapImpl, evo: FeatureEvolution) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const groups = groupByFeatureThenProduct(items);
  const months = useMemo(() => buildMonths(items), [items]);
  const quarterGroups = useMemo(() => buildQuarterGroups(months), [months]);
  const trackWidth = months.length * COL;
  const todayIso = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentMonthKey = monthKey(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const currentMonthIndex = months.findIndex((m) => m.key === currentMonthKey);

  // Abre a timeline já posicionada no mês atual.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || currentMonthIndex < 0) return;
    const frame = window.requestAnimationFrame(() => {
      el.scrollLeft = currentMonthIndex * COL;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentMonthIndex, items]);

  if (groups.length === 0) {
    return (
      <SurfaceCard className="p-6 text-sm text-[var(--muted-foreground)]">
        Nenhum item com os filtros atuais.
      </SurfaceCard>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white"
    >
      <div
        className="sticky top-0 z-40 border-b border-[var(--border)] bg-slate-50"
        style={{ minWidth: LABEL + trackWidth }}
      >
        {/* Linha 1: ano + quarter */}
        <div className="flex border-b border-slate-200/80">
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-[var(--border)] bg-slate-50 px-4 py-1.5"
            style={{ width: LABEL }}
          />
          <div className="flex" style={{ width: trackWidth }}>
            {quarterGroups.map((q, idx) => (
              <div
                key={q.key}
                className={cn(
                  "flex items-center justify-center border-l border-slate-200 bg-slate-100/80 py-1.5 text-center",
                  idx % 2 === 1 && "bg-slate-50",
                )}
                style={{ width: q.span * COL }}
              >
                <span className="text-[11px] font-semibold tracking-wide text-slate-700">
                  {q.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Linha 2: meses */}
        <div className="flex">
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-[var(--border)] bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
            style={{ width: LABEL }}
          >
            Funcionalidade / Produto / Canal
          </div>
          <div className="flex" style={{ width: trackWidth }}>
            {months.map((m) => {
              const q = quarterOf(m.date);
              const isCurrent = m.key === currentMonthKey;
              return (
                <div
                  key={m.key}
                  className={cn(
                    "border-l border-slate-100 py-2 text-center",
                    isCurrent
                      ? "bg-[var(--brand-soft)]"
                      : q % 2 === 0
                        ? "bg-white/40"
                        : "bg-transparent",
                  )}
                  style={{ width: COL }}
                  title={`${m.label} ${m.date.getFullYear()} · Q${q}${isCurrent ? " · mês atual" : ""}`}
                >
                  <p
                    className={cn(
                      "text-[11px] font-semibold",
                      isCurrent ? "text-[var(--brand)]" : "text-slate-600",
                    )}
                  >
                    {m.label}
                  </p>
                  <p
                    className={cn(
                      "text-[9px] font-medium",
                      isCurrent ? "text-[var(--brand)]/80" : "text-slate-400",
                    )}
                  >
                    {String(m.date.getFullYear()).slice(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.featureId} className="border-b border-slate-100">
          <div
            className="flex border-b border-slate-50 bg-white"
            style={{ minWidth: LABEL + trackWidth }}
          >
            <button
              type="button"
              onClick={() => onOpenFeature(group.featureId)}
              className="sticky left-0 z-10 shrink-0 border-r border-slate-100 bg-white px-4 py-2.5 text-left hover:bg-slate-50"
              style={{ width: LABEL }}
            >
              <span className="text-sm font-semibold text-[var(--brand)]">
                {group.featureName}
              </span>
              <span className="ml-2 text-[11px] text-slate-400">
                {group.products.length}{" "}
                {group.products.length === 1 ? "produto" : "produtos"}
              </span>
            </button>
            <div style={{ width: trackWidth }} />
          </div>

          {group.products.map((product) => (
            <div key={product.productId}>
              <div
                className="flex bg-slate-50/60"
                style={{ minWidth: LABEL + trackWidth }}
              >
                <div
                  className="sticky left-0 z-10 shrink-0 border-r border-slate-100 bg-slate-50/95 px-4 py-1.5"
                  style={{ width: LABEL }}
                >
                  <span className="text-xs font-semibold text-slate-700">
                    {product.productShortName}
                  </span>
                  <span className="ml-2 text-[10px] text-slate-400">
                    {product.items.length}{" "}
                    {product.items.length === 1 ? "canal" : "canais"}
                  </span>
                </div>
                <div style={{ width: trackWidth }} />
              </div>

              {product.items.map((item) => {
                const isAvailable = item.phase === "AVAILABLE";
                const implBar = barFromDates(
                  isAvailable
                    ? item.launchDate
                    : (item.startDate ?? item.expectedDate),
                  isAvailable
                    ? todayIso
                    : item.expectedDate,
                  months,
                  isAvailable && !item.launchDate,
                );
                const active = activeEvolutions(item);
                const barTitle = isAvailable
                  ? `${featureStageLabel[item.phase]} · ${formatMonthYear(item.launchDate)} → hoje`
                  : `${featureStageLabel[item.phase]} · ${formatMonthYear(item.startDate)} → ${formatMonthYear(item.expectedDate)}`;

                return (
                  <div key={item.id}>
                    <TimelineRow
                      label={`└ ${item.channelName}`}
                      sublabel={`${item.audienceName} · ${item.momentName} · ${temporalStatusLabel[item.temporalStatus]}`}
                      bar={implBar}
                      barClass={STAGE_BAR[item.phase]}
                      barText={featureStageLabel[item.phase]}
                      barTitle={barTitle}
                      months={months}
                      trackWidth={trackWidth}
                      onClick={() => onOpenFeature(item.featureId)}
                    />
                    {active.map((evo) => {
                      const evoBar = barFromDates(
                        evo.startDate,
                        evo.expectedDate,
                        months,
                      );
                      return (
                        <TimelineRow
                          key={evo.id}
                          label={`·· Evolução: ${evo.title}`}
                          sublabel={`${evolutionPhaseLabel(evo.phase)} · Prev. ${formatMonthYear(evo.expectedDate)}`}
                          bar={evoBar}
                          barClass="bg-amber-300/90"
                          barText={`✦ ${evolutionPhaseLabel(evo.phase)}`}
                          barTitle={evo.title}
                          months={months}
                          trackWidth={trackWidth}
                          indented
                          onClick={() => onOpenEvolution(item, evo)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TimelineRow({
  label,
  sublabel,
  bar,
  barClass,
  barText,
  barTitle,
  months,
  trackWidth,
  indented,
  onClick,
}: {
  label: string;
  sublabel: string;
  bar: { start: number; span: number } | null;
  barClass: string;
  barText: string;
  barTitle: string;
  months: { key: string }[];
  trackWidth: number;
  indented?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-stretch hover:bg-slate-50/60"
      style={{ minWidth: LABEL + trackWidth }}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "sticky left-0 z-10 shrink-0 border-r border-slate-100 bg-white px-4 py-3 text-left hover:bg-slate-50",
          indented && "pl-6",
        )}
        style={{ width: LABEL }}
      >
        <p
          className={cn(
            "truncate text-xs font-medium",
            indented ? "text-amber-800" : "text-slate-800",
          )}
        >
          {label}
        </p>
        <p className="truncate text-[10px] text-slate-400">{sublabel}</p>
      </button>
      <div className="relative h-12" style={{ width: trackWidth }}>
        <div className="absolute inset-0 flex">
          {months.map((m) => (
            <div
              key={m.key}
              className="h-full border-l border-slate-50"
              style={{ width: COL }}
            />
          ))}
        </div>
        {bar ? (
          <div
            className="absolute top-1/2 flex -translate-y-1/2 items-center px-1"
            style={{
              left: bar.start * COL,
              width: bar.span * COL,
            }}
          >
            <div
              className={cn(
                "flex h-7 w-full items-center overflow-hidden rounded-md px-2 text-[10px] font-semibold text-white shadow-sm",
                indented && "border border-dashed border-amber-500/50 text-amber-950",
                barClass,
              )}
              title={barTitle}
            >
              <span className="truncate">{barText}</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-y-0 left-2 flex items-center">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              {barText} · sem data
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
