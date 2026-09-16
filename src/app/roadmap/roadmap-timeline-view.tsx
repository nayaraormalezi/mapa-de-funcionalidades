"use client";

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

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonths() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return Array.from({ length: 8 }, (_, i) => {
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

  const parse = (raw: string | null) => {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  let start = parse(startRaw);
  let end = parse(endRaw);

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
  const groups = groupByFeatureThenProduct(items);
  const months = buildMonths();
  const trackWidth = months.length * COL;

  if (groups.length === 0) {
    return (
      <SurfaceCard className="p-6 text-sm text-[var(--muted-foreground)]">
        Nenhum item de roadmap com os filtros atuais.
      </SurfaceCard>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
      <div
        className="flex border-b border-[var(--border)] bg-slate-50"
        style={{ minWidth: LABEL + trackWidth }}
      >
        <div
          className="sticky left-0 z-30 shrink-0 border-r border-[var(--border)] bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
          style={{ width: LABEL }}
        >
          Funcionalidade / Produto / Canal
        </div>
        <div className="flex" style={{ width: trackWidth }}>
          {months.map((m) => (
            <div
              key={m.key}
              className="border-l border-slate-100 py-2.5 text-center text-[11px] font-semibold text-slate-500"
              style={{ width: COL }}
            >
              {m.label}
            </div>
          ))}
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
                const implBar = barFromDates(
                  item.startDate ?? item.launchDate,
                  item.phase === "AVAILABLE"
                    ? new Date().toISOString()
                    : item.expectedDate,
                  months,
                  item.phase === "AVAILABLE",
                );
                const active = activeEvolutions(item);

                return (
                  <div key={item.id}>
                    <TimelineRow
                      label={`└ ${item.channelName}`}
                      sublabel={`${item.audienceName} · ${item.momentName} · ${temporalStatusLabel[item.temporalStatus]}`}
                      bar={implBar}
                      barClass={STAGE_BAR[item.phase]}
                      barText={featureStageLabel[item.phase]}
                      barTitle={`${featureStageLabel[item.phase]} · ${formatMonthYear(item.startDate)} → ${formatMonthYear(item.expectedDate)}`}
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
