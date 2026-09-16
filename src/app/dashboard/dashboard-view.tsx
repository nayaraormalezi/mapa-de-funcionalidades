"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FilterSelect,
  ProgressBar,
  SurfaceCard,
} from "@/components/ui/prototype";
import { DEVELOPMENT_STAGES, FEATURE_STAGE_ORDER, FEATURE_STATUS_ORDER, featureStageLabel, featureStatusLabel, priorityLabel } from "@/lib/labels";
import { cn, formatPercent } from "@/lib/utils";
import type {
  CoverageItem,
  FeatureMapRow,
  FeatureStage,
  FeatureStatus,
  Gap,
  Priority,
} from "@/types";
import {
  ChevronRight,
  FileText,
  Handshake,
  RefreshCw,
  ShieldAlert,
  ShoppingCart,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DashboardChannelTabs } from "./dashboard-channel-tabs";

type Option = { value: string; label: string };

type TabData = {
  id: string;
  label: string;
  moments: {
    momentName: string;
    current: string[];
    future: string[];
  }[];
};

type StatusSlice = {
  status: FeatureStatus;
  count: number;
  color: string;
};

const STAGE_TONE: Record<
  FeatureStage,
  "default" | "success" | "warning" | "info" | "danger"
> = {
  BACKLOG: "info",
  UX_UI: "info",
  DEVELOPMENT: "warning",
  HOMOLOGATION: "warning",
  PAUSED: "default",
  REMOVED: "default",
  AVAILABLE: "success",
};

const STATUS_COLORS: Record<FeatureStatus, string> = {
  ON_TRACK: "#22c55e",
  DELAYED: "#ef4444",
  NO_DEADLINE: "#94a3b8",
};

const PRIORITY_DOT: Record<Priority, string> = {
  CRITICAL: "bg-rose-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-[var(--brand)]",
  LOW: "bg-slate-400",
};

const PRIORITY_BADGE: Record<Priority, string> = {
  CRITICAL: "bg-[#fee2e2] text-[#dc2626]",
  HIGH: "bg-[#fef3c7] text-[#d97706]",
  MEDIUM: "bg-[#e6f0f7] text-[#005ca9]",
  LOW: "bg-slate-100 text-slate-600",
};

const AUDIENCE_ICONS: Record<string, LucideIcon> = {
  cliente: Users,
  economiário: User,
  economiario: User,
  parceiro: Handshake,
};

const MOMENT_ICONS: Record<string, LucideIcon> = {
  venda: ShoppingCart,
  "pós-venda": RefreshCw,
  "pos-venda": RefreshCw,
};

function iconForLabel(
  name: string,
  map: Record<string, LucideIcon>,
  fallback: LucideIcon,
) {
  const key = name.trim().toLowerCase();
  return map[key] ?? fallback;
}

function uniqueFeatures(rows: FeatureMapRow[]) {
  return new Set(rows.map((r) => r.featureId));
}

function bestFeatureStage(stages: FeatureStage[]): FeatureStage {
  if (stages.includes("AVAILABLE")) return "AVAILABLE";
  const inDev = stages.find((s) => DEVELOPMENT_STAGES.includes(s));
  if (inDev) return inDev;
  if (stages.includes("BACKLOG")) return "BACKLOG";
  if (stages.includes("PAUSED")) return "PAUSED";
  return stages[0] ?? "REMOVED";
}

function featurePrimaryStages(rows: FeatureMapRow[]) {
  const byFeature = new Map<string, FeatureStage[]>();
  for (const row of rows) {
    const list = byFeature.get(row.featureId) ?? [];
    list.push(row.phase);
    byFeature.set(row.featureId, list);
  }
  return Array.from(byFeature.values()).map(bestFeatureStage);
}

function featurePrimaryStatuses(rows: FeatureMapRow[]) {
  const byFeature = new Map<string, FeatureStatus[]>();
  for (const row of rows) {
    const list = byFeature.get(row.featureId) ?? [];
    list.push(row.status);
    byFeature.set(row.featureId, list);
  }
  return Array.from(byFeature.values()).map((statuses) => {
    if (statuses.includes("DELAYED")) return "DELAYED";
    if (statuses.includes("ON_TRACK")) return "ON_TRACK";
    return statuses[0] ?? "NO_DEADLINE";
  });
}

function coverageFor(
  rows: FeatureMapRow[],
  items: { id: string; name: string }[],
  key: "audienceId" | "momentId",
): CoverageItem[] {
  return items.map((item) => {
    const scoped = rows.filter((r) => r[key] === item.id);
    const total = uniqueFeatures(scoped).size;
    const available = uniqueFeatures(
      scoped.filter((r) => r.phase === "AVAILABLE"),
    ).size;
    return {
      id: item.id,
      name: item.name,
      total,
      available,
      percentage: total === 0 ? 0 : (available / total) * 100,
    };
  });
}

function periodCutoff(period: string): Date | null {
  if (!period) return null;
  const now = new Date();
  if (period === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  if (period === "90d") {
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }
  if (period === "ytd") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

function rowInPeriod(row: FeatureMapRow, cutoff: Date): boolean {
  const candidates = [row.launchDate, row.expectedDate, row.startDate].filter(
    Boolean,
  ) as string[];
  if (candidates.length === 0) return true;
  return candidates.some((raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return true;
    return date >= cutoff;
  });
}

export function DashboardView({
  userName,
  rows,
  audiences,
  moments,
  products,
  gaps,
  gapMeta,
  channelTabs,
  updatedAtLabel,
}: {
  userName: string;
  rows: FeatureMapRow[];
  audiences: Option[];
  moments: Option[];
  products: Option[];
  gaps: Gap[];
  gapMeta: Record<
    string,
    { audience: string; moment: string; channel: string }
  >;
  channelTabs: TabData[];
  updatedAtLabel: string;
}) {
  const [audienceId, setAudienceId] = useState("");
  const [momentId, setMomentId] = useState("");
  const [product, setProduct] = useState("");
  const [period, setPeriod] = useState("");

  const periodOptions = useMemo(
    () => [
      { value: "", label: "Todos" },
      { value: "30d", label: "Últimos 30 dias" },
      { value: "90d", label: "Últimos 90 dias" },
      { value: "ytd", label: "Ano corrente" },
    ],
    [],
  );

  const filteredRows = useMemo(() => {
    const cutoff = periodCutoff(period);
    return rows.filter((r) => {
      if (audienceId && r.audienceId !== audienceId) return false;
      if (momentId && r.momentId !== momentId) return false;
      if (product && r.productId !== product && r.product !== product) return false;
      if (cutoff && !rowInPeriod(r, cutoff)) return false;
      return true;
    });
  }, [rows, audienceId, momentId, product, period]);

  const filteredGaps = useMemo(() => {
    return gaps.filter((g) => {
      if (audienceId && g.audienceId !== audienceId) return false;
      if (momentId && g.momentId !== momentId) return false;
      return true;
    });
  }, [gaps, audienceId, momentId]);

  const filteredTabs = useMemo(() => {
    if (!audienceId) return channelTabs;
    return channelTabs.filter((t) => t.id === audienceId);
  }, [channelTabs, audienceId]);

  const kpis = useMemo(() => {
    const stages = featurePrimaryStages(filteredRows);
    const total = stages.length || 1;
    const byStage = Object.fromEntries(
      FEATURE_STAGE_ORDER.map((stage) => [
        stage,
        stages.filter((s) => s === stage).length,
      ]),
    ) as Record<FeatureStage, number>;
    const gapCount = filteredGaps.length;
    return {
      total: stages.length,
      byStage,
      gaps: gapCount,
      gapsPct: (gapCount / total) * 100,
    };
  }, [filteredRows, filteredGaps]);

  const byAudience = useMemo(
    () =>
      coverageFor(
        filteredRows,
        audiences.map((a) => ({ id: a.value, name: a.label })),
        "audienceId",
      ),
    [filteredRows, audiences],
  );

  const byMoment = useMemo(
    () =>
      coverageFor(
        filteredRows,
        moments.map((m) => ({ id: m.value, name: m.label })),
        "momentId",
      ),
    [filteredRows, moments],
  );

  const statusSlices: StatusSlice[] = useMemo(() => {
    const counts = new Map<FeatureStatus, number>();
    for (const status of featurePrimaryStatuses(filteredRows)) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    return FEATURE_STATUS_ORDER.map((status) => ({
      status,
      count: counts.get(status) ?? 0,
      color: STATUS_COLORS[status],
    }));
  }, [filteredRows]);

  const statusTotal = statusSlices.reduce((acc, s) => acc + s.count, 0) || 1;

  const donutGradient = statusSlices
    .filter((slice) => slice.count > 0)
    .reduce<{ parts: string[]; cursor: number }>(
      (acc, slice) => {
        const start = acc.cursor;
        const end = start + (slice.count / statusTotal) * 100;
        acc.parts.push(`${slice.color} ${start}% ${end}%`);
        acc.cursor = end;
        return acc;
      },
      { parts: [], cursor: 0 },
    )
    .parts.join(", ");

  const greetName = userName.trim().split(/\s+/)[0] || "usuário";
  const shortDate = useMemo(
    () => new Date().toLocaleDateString("pt-BR"),
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-slate-500">{`Olá, ${greetName}!`}</p>
          <h1 className="text-[28px] leading-tight font-bold tracking-tight text-[var(--sidebar)]">
            PRISMA
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
            Plataforma de Gestão de Experiência
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Público"
            value={audienceId}
            onChange={setAudienceId}
            options={[{ value: "", label: "Todos" }, ...audiences]}
            className="min-w-[160px]"
          />
          <FilterSelect
            label="Momento"
            value={momentId}
            onChange={setMomentId}
            options={[{ value: "", label: "Todos" }, ...moments]}
            className="min-w-[160px]"
          />
          <FilterSelect
            label="Produto"
            value={product}
            onChange={setProduct}
            options={[{ value: "", label: "Todos" }, ...products]}
            className="min-w-[140px]"
          />
          <FilterSelect
            label="Período"
            value={period}
            onChange={setPeriod}
            options={periodOptions}
            className="min-w-[140px]"
          />
        </div>
        <p className="pb-2 text-xs text-slate-500">
          Última atualização: {updatedAtLabel}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard
          icon={FileText}
          value={kpis.total}
          label="Funcionalidades"
          trend="▲ +12% em relação ao mês anterior"
          tone="default"
        />
        <KpiCard
          icon={ShieldAlert}
          value={kpis.gaps}
          label="Gaps identificados"
          hint={`${formatPercent(kpis.gapsPct)} do recorte`}
          tone="danger"
          bar={kpis.gapsPct}
        />
      </div>

      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Etapa</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Distribuição das funcionalidades por etapa
            </p>
          </div>
          <Link
            href="/roadmap"
            className="shrink-0 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
          {FEATURE_STAGE_ORDER.map((stage) => {
            const count = kpis.byStage[stage];
            const pct = kpis.total === 0 ? 0 : (count / kpis.total) * 100;
            return (
              <KpiCard
                key={stage}
                value={count}
                label={featureStageLabel[stage]}
                hint={`${formatPercent(pct)}`}
                tone={STAGE_TONE[stage]}
                bar={pct}
              />
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SurfaceCard className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Cobertura por público
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Percentual de funcionalidades disponíveis
            </p>
          </div>
          <div className="space-y-3.5">
            {byAudience.map((item) => (
              <CoverageRow
                key={item.id}
                name={item.name}
                pct={item.percentage}
                icon={iconForLabel(item.name, AUDIENCE_ICONS, Users)}
              />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Cobertura por momento
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Percentual de funcionalidades disponíveis
            </p>
          </div>
          <div className="space-y-3.5">
            {byMoment.map((item) => (
              <CoverageRow
                key={item.id}
                name={item.name}
                pct={item.percentage}
                icon={iconForLabel(item.name, MOMENT_ICONS, ShoppingCart)}
              />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Status</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Situação de prazo das funcionalidades
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div
              className="relative h-[112px] w-[112px] shrink-0 rounded-full"
              style={{
                background:
                  statusSlices.some((s) => s.count > 0)
                    ? `conic-gradient(${donutGradient})`
                    : "#e2e8f0",
              }}
            >
              <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-white">
                <span className="text-xl font-bold text-slate-900 tabular-nums">
                  {kpis.total}
                </span>
                <span className="text-[10px] text-slate-500">
                  funcionalidades
                </span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2">
              {statusSlices.map((slice) => (
                <li
                  key={slice.status}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-slate-700">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: slice.color }}
                    />
                    <span className="truncate">
                      {featureStatusLabel[slice.status]}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-xs font-medium text-slate-500">
                    {slice.count} ·{" "}
                    {formatPercent((slice.count / statusTotal) * 100)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <SurfaceCard className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Destaque da transformação de canais
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Evolução para uma experiência mais integrada
            </p>
          </div>
          <DashboardChannelTabs tabs={filteredTabs} />
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Principais gaps
            </h2>
            <Link
              href="/gaps"
              className="text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          {filteredGaps.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum gap aberto no recorte.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredGaps.slice(0, 4).map((gap) => {
                const meta = gapMeta[gap.id];
                return (
                  <li key={gap.id}>
                    <Link
                      href={`/gaps/${gap.id}`}
                      className="flex items-start gap-2.5 py-3 transition-colors hover:bg-slate-50/80"
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          PRIORITY_DOT[gap.priority],
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {gap.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {meta
                            ? `${meta.audience} · ${meta.moment} · ${meta.channel}`
                            : priorityLabel[gap.priority]}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          PRIORITY_BADGE[gap.priority],
                        )}
                      >
                        {priorityLabel[gap.priority]}
                      </span>
                      <span className="mt-0.5 shrink-0 text-[11px] text-slate-400 tabular-nums">
                        {shortDate}
                      </span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

function CoverageRow({
  name,
  pct,
  icon: Icon,
}: {
  name: string;
  pct: number;
  icon: LucideIcon;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
          <Icon
            className="h-4 w-4 shrink-0 text-[var(--brand)]"
            aria-hidden
          />
          <span className="truncate">{name}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-slate-600 tabular-nums">
          {formatPercent(pct)}
        </span>
      </div>
      <ProgressBar
        value={pct}
        className="h-2"
        barClassName="bg-[var(--brand)]"
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  value,
  label,
  hint,
  trend,
  tone,
  bar,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  hint?: string;
  trend?: string;
  tone: "default" | "success" | "warning" | "info" | "danger";
  bar?: number;
}) {
  const tones = {
    default: {
      icon: "bg-slate-100 text-slate-600",
      bar: "bg-slate-400",
      hint: "text-slate-500",
    },
    success: {
      icon: "bg-emerald-50 text-emerald-600",
      bar: "bg-emerald-500",
      hint: "text-emerald-700",
    },
    warning: {
      icon: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
      hint: "text-amber-700",
    },
    info: {
      icon: "bg-[var(--brand-soft)] text-[var(--brand)]",
      bar: "bg-[var(--brand)]",
      hint: "text-[var(--brand)]",
    },
    danger: {
      icon: "bg-rose-50 text-rose-600",
      bar: "bg-rose-500",
      hint: "text-rose-700",
    },
  }[tone];

  return (
    <SurfaceCard className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[26px] leading-none font-bold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          <p className="mt-1.5 text-sm font-medium text-slate-700">{label}</p>
          {trend ? (
            <p className="mt-2 text-xs font-medium text-emerald-600">{trend}</p>
          ) : null}
          {hint ? (
            <p className={cn("mt-2 text-xs font-medium", tones.hint)}>{hint}</p>
          ) : null}
          {typeof bar === "number" ? (
            <ProgressBar
              value={bar}
              className="mt-2 h-1.5"
              barClassName={tones.bar}
            />
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              tones.icon,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}
