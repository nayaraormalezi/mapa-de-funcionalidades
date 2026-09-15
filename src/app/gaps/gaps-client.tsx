"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Button } from "@/components/ui/button";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { gapStatusLabel, gapTypeLabel, priorityLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Gap, GapStatus, GapType, Priority } from "@/types";
import { MoreHorizontal, Plus, ShieldAlert } from "lucide-react";

const TYPE_COLORS: Record<GapType, string> = {
  COVERAGE: "#145fab",
  EXPERIENCE: "#b26f9b",
  CONSISTENCY: "#00b5e5",
  INFORMATION: "#667085",
  OPERATIONAL: "#f39300",
  TRANSITION: "#ef765e",
};

const TYPE_BADGE: Record<GapType, string> = {
  COVERAGE: "bg-[#e8f1fa] text-[#145fab] ring-[#cfe3f5]",
  EXPERIENCE: "bg-[#f8eef5] text-[#b26f9b] ring-[#e8c9dc]",
  CONSISTENCY: "bg-[#cff0fb] text-[#006d8f] ring-[#b9e8f5]",
  INFORMATION: "bg-slate-50 text-slate-700 ring-slate-200",
  OPERATIONAL: "bg-[#fef0d4] text-[#98522d] ring-[#fde8c8]",
  TRANSITION: "bg-[#fce5df] text-[#8c2f1e] ring-[#fce5df]",
};

type ViewTab = "lista" | "jornada" | "canal" | "matriz";

export function GapsClient({
  gaps,
  audiences,
  moments,
  journeyNameById = {},
  summary,
}: {
  gaps: Gap[];
  audiences: { id: string; name: string }[];
  moments: { id: string; name: string }[];
  journeyNameById?: Record<string, string>;
  summary: {
    totalOpen: number;
    byType: { type: GapType; label: string; count: number }[];
    byImpact: { impact: string; count: number }[];
    transitionCount: number;
    criticalCount: number;
  };
}) {
  const [type, setType] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [momentId, setMomentId] = useState("");
  const [status, setStatus] = useState("");
  const [impact, setImpact] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("lista");

  const filtered = useMemo(() => {
    return gaps.filter((gap) => {
      if (type && gap.type !== type) return false;
      if (audienceId && gap.audienceId !== audienceId) return false;
      if (momentId && gap.momentId !== momentId) return false;
      if (impact && gap.impact !== impact) return false;
      if (status && gap.status !== status) return false;
      return true;
    });
  }, [gaps, type, audienceId, momentId, impact, status]);

  const opportunities = gaps.filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  ).length;
  const inTreatment = gaps.filter((g) => g.status === "IN_PROGRESS").length;
  const done = gaps.filter((g) => g.status === "RESOLVED").length;
  const highImpactShare =
    gaps.length === 0
      ? 0
      : Math.round(
          (gaps.filter(
            (g) => g.impact === "HIGH" || g.impact === "CRITICAL",
          ).length /
            gaps.length) *
            100,
        );

  const chartByType = useMemo(() => {
    const counts = new Map<GapType, number>();
    for (const gap of filtered) {
      counts.set(gap.type, (counts.get(gap.type) ?? 0) + 1);
    }
    return (Object.keys(gapTypeLabel) as GapType[])
      .filter((t) => (counts.get(t) ?? 0) > 0)
      .map((t) => ({
        type: t,
        label: gapTypeLabel[t],
        count: counts.get(t) ?? 0,
        color: TYPE_COLORS[t],
      }));
  }, [filtered]);

  const typeTotal = chartByType.reduce((a, s) => a + s.count, 0) || 1;

  const chartByPriority = useMemo(() => {
    const order: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    const counts = new Map<Priority, number>();
    for (const gap of filtered) {
      counts.set(gap.priority, (counts.get(gap.priority) ?? 0) + 1);
    }
    const max = Math.max(...order.map((p) => counts.get(p) ?? 0), 1);
    return order.map((p) => ({
      priority: p,
      label: priorityLabel[p],
      count: counts.get(p) ?? 0,
      pct: ((counts.get(p) ?? 0) / max) * 100,
      share: Math.round(((counts.get(p) ?? 0) / (filtered.length || 1)) * 100),
    }));
  }, [filtered]);

  const byJourney = useMemo(() => {
    const map = new Map<string, Gap[]>();
    for (const gap of filtered) {
      const key =
        journeyNameById[gap.journeyId] || gap.journeyId || "Sem jornada";
      const list = map.get(key) ?? [];
      list.push(gap);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([name, list]) => ({ name, list }));
  }, [filtered, journeyNameById]);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Gaps & oportunidades › Visão geral"
        title="Gaps & oportunidades"
        description="Identifique lacunas na experiência, priorize oportunidades e acompanhe os planos de ação."
        actions={
          <Button asChild size="sm">
            <Link href="/cadastros/gaps">
              <Plus className="h-3.5 w-3.5" />
              Nova oportunidade
            </Link>
          </Button>
        }
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Público"
            value={audienceId}
            onChange={setAudienceId}
            options={[
              { value: "", label: "Todos" },
              ...audiences.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <FilterSelect
            label="Momento"
            value={momentId}
            onChange={setMomentId}
            options={[
              { value: "", label: "Todos" },
              ...moments.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <FilterSelect
            label="Tipo de gap"
            value={type}
            onChange={setType}
            options={[
              { value: "", label: "Todos" },
              ...Object.entries(gapTypeLabel).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todos" },
              ...Object.entries(gapStatusLabel).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
          <FilterSelect
            label="Impacto"
            value={impact}
            onChange={setImpact}
            options={[
              { value: "", label: "Todos" },
              ...Object.entries(priorityLabel).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gaps identificados"
          value={gaps.length}
          tone="warning"
          icon={ShieldAlert}
          trend={`▲ ${summary.criticalCount} críticos`}
        />
        <StatCard
          label="Oportunidades"
          value={opportunities}
          tone="info"
          trend="Em aberto ou tratamento"
        />
        <StatCard label="Em tratamento" value={inTreatment} tone="accent" />
        <StatCard label="Concluídos" value={done} tone="success" />
      </div>

      <SurfaceCard className="border-[#fde8c8] bg-[#fffbeb] p-4 text-sm text-[#844200]">
        <strong>Principais impactos:</strong> {highImpactShare}% dos gaps têm
        impacto alto ou crítico na experiência do usuário.
      </SurfaceCard>

      <UnderlineTabs
        value={viewTab}
        onChange={(id) => setViewTab(id as ViewTab)}
        options={[
          { id: "lista", label: "Lista" },
          { id: "jornada", label: "Visão por jornada" },
          { id: "canal", label: "Visão por canal" },
          { id: "matriz", label: "Matriz de gaps" },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="Nenhum gap encontrado"
              description="Ajuste os filtros ou cadastre uma nova oportunidade."
            />
          ) : viewTab === "jornada" ? (
            <div className="space-y-4">
              {byJourney.map((group) => (
                <SurfaceCard key={group.name} className="p-4">
                  <SectionTitle>
                    {group.name}{" "}
                    <span className="font-normal text-[var(--muted-foreground)]">
                      ({group.list.length})
                    </span>
                  </SectionTitle>
                  <ul className="space-y-2">
                    {group.list.map((gap) => (
                      <li key={gap.id}>
                        <Link
                          href={`/gaps/${gap.id}`}
                          className="text-sm font-medium text-[var(--brand)] hover:underline"
                        >
                          {gap.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </SurfaceCard>
              ))}
            </div>
          ) : viewTab === "canal" ? (
            <SurfaceCard className="p-4 text-sm text-[var(--muted-foreground)]">
              Agrupe por canal na lista completa — use o filtro de tipo e
              prioridade para focar oportunidades por contexto.
            </SurfaceCard>
          ) : viewTab === "matriz" ? (
            <SurfaceCard className="overflow-x-auto p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(gapTypeLabel) as GapType[]).map((t) => (
                  <div
                    key={t}
                    className="rounded-xl border border-[var(--border)] px-3 py-3"
                  >
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {gapTypeLabel[t]}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {filtered.filter((g) => g.type === t).length}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                  <tr>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Tipo de gap</th>
                    <th className="px-4 py-3">Jornada</th>
                    <th className="px-4 py-3">Público</th>
                    <th className="px-4 py-3">Impacto</th>
                    <th className="px-4 py-3">Prioridade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((gap) => (
                    <tr
                      key={gap.id}
                      className="border-t border-[var(--border)] hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/gaps/${gap.id}`}
                          className="font-medium text-slate-900 hover:text-[var(--brand)]"
                        >
                          {gap.title}
                        </Link>
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                          {gap.description || gap.responsible || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                            TYPE_BADGE[gap.type],
                          )}
                        >
                          {gapTypeLabel[gap.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {journeyNameById[gap.journeyId] || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {audiences.find((a) => a.id === gap.audienceId)?.name ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {priorityLabel[gap.impact]}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={gap.priority} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {gapStatusLabel[gap.status as GapStatus]}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100"
                          aria-label="Ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
                Mostrando {filtered.length} de {filtered.length} gaps
              </p>
            </SurfaceCard>
          )}

          <SurfaceCard className="mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Quer sugerir uma nova oportunidade?
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                Compartilhe um insight ou ideia de melhoria para evoluirmos
                juntos a experiência da CAIXA Consórcio.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/cadastros/gaps">
                <Plus className="h-3.5 w-3.5" />
                Nova oportunidade
              </Link>
            </Button>
          </SurfaceCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <SurfaceCard className="p-4">
            <SectionTitle>Gaps por tipo</SectionTitle>
            <ul className="space-y-2">
              {chartByType.map((slice) => (
                <li
                  key={slice.type}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: slice.color }}
                    />
                    <span className="truncate">{slice.label}</span>
                  </span>
                  <span className="tabular-nums text-slate-500">
                    {Math.round((slice.count / typeTotal) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <SectionTitle>Gaps por prioridade</SectionTitle>
            <div className="space-y-3">
              {chartByPriority.map((item) => (
                <div key={item.priority}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span className="tabular-nums text-slate-500">
                      {item.share}%
                    </span>
                  </div>
                  <ProgressBar
                    value={item.pct}
                    barClassName={
                      item.priority === "CRITICAL"
                        ? "bg-rose-500"
                        : item.priority === "HIGH"
                          ? "bg-amber-500"
                          : item.priority === "MEDIUM"
                            ? "bg-sky-500"
                            : "bg-slate-400"
                    }
                  />
                </div>
              ))}
            </div>
          </SurfaceCard>
        </aside>
      </div>
    </div>
  );
}
