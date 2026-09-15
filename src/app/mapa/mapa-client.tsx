"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { FeatureMatrix } from "@/components/map/feature-matrix";
import { FeatureRow } from "@/components/map/feature-row";
import { NovaFuncionalidadeModal } from "@/components/map/nova-funcionalidade-modal";
import { StatusBadge } from "@/components/badges/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  FilterSelect,
  PageHeader,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { useMapFilters } from "@/hooks/use-map-filters";
import {
  FEATURE_STATUS_ORDER,
  experienceLabel,
  featureStatusLabel,
  featureStatusOptions,
  priorityLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  ExperienceLevel,
  FeatureMapRow,
  FeatureStatus,
  MapFilters,
  Priority,
} from "@/types";
import {  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Table2,
} from "lucide-react";

type Option = { value: string; label: string };
type JourneyOption = Option & { momentIds: string[] };

const legendDot: Record<FeatureStatus, string> = {
  BACKLOG: "bg-[#00b5e5]",
  UX_UI: "bg-[#b26f9b]",
  DEVELOPMENT: "bg-[#f39300]",
  HOMOLOGATION: "bg-[#f8b019]",
  PAUSED: "bg-[#145fab]",
  REMOVED: "bg-stone-500",
  AVAILABLE: "bg-[#a6ce39]",
};

const PAGE_SIZE = 12;

const viewTabs = [
  { id: "feature", label: "Visão por funcionalidade" },
  { id: "channel", label: "Visão por canal" },
  { id: "journey", label: "Visão por jornada" },
] as const;

type ViewTab = (typeof viewTabs)[number]["id"];

function singleSelect(
  updateFilter: <K extends keyof MapFilters>(
    key: K,
    value: MapFilters[K],
  ) => void,
  key: Exclude<keyof MapFilters, "search">,
  value: string,
) {
  updateFilter(key, (value ? [value] : []) as MapFilters[typeof key]);
}

function groupByChannel(rows: FeatureMapRow[]) {
  const map = new Map<
    string,
    { channelName: string; temporal: string; rows: FeatureMapRow[] }
  >();
  for (const row of rows) {
    const entry = map.get(row.channelId) ?? {
      channelName: row.channelName,
      temporal: row.temporalStatus,
      rows: [],
    };
    entry.rows.push(row);
    map.set(row.channelId, entry);
  }
  return Array.from(map.entries()).map(([id, v]) => ({
    id,
    ...v,
    featureCount: new Set(v.rows.map((r) => r.featureId)).size,
  }));
}

function groupByJourney(rows: FeatureMapRow[]) {
  const map = new Map<
    string,
    { journeyName: string; rows: FeatureMapRow[] }
  >();
  for (const row of rows) {
    const entry = map.get(row.journeyId) ?? {
      journeyName: row.journeyName,
      rows: [],
    };
    entry.rows.push(row);
    map.set(row.journeyId, entry);
  }
  return Array.from(map.entries()).map(([id, v]) => ({
    id,
    ...v,
    featureCount: new Set(v.rows.map((r) => r.featureId)).size,
    needCount: new Set(v.rows.map((r) => r.userNeedId)).size,
  }));
}

export function MapaClient({
  rows,
  audiences,
  moments,
  journeys,
  channels,
  products,
  responsibles,
}: {
  rows: FeatureMapRow[];
  audiences: Option[];
  moments: Option[];
  journeys: JourneyOption[];
  channels: Option[];
  products: Option[];
  responsibles: Option[];
}) {
  const defaultAudience =
    audiences.find((a) => /cliente/i.test(a.label))?.value ?? "";
  const defaultMoment =
    moments.find((m) => /p[oó]s[- ]?venda/i.test(m.label))?.value ?? "";

  const { filters, filteredRows, updateFilter, clearFilters } = useMapFilters(
    rows,
    {
      audienceIds: defaultAudience ? [defaultAudience] : [],
      momentIds: defaultMoment ? [defaultMoment] : [],
    },
  );
  const [layout, setLayout] = useState<"matrix" | "table">("matrix");
  const [viewTab, setViewTab] = useState<ViewTab>("feature");
  const [moreFilters, setMoreFilters] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const statusOptions = featureStatusOptions();
  const experienceOptions = Object.entries(experienceLabel).map(
    ([value, label]) => ({ value, label }),
  );
  const priorityOptions = Object.entries(priorityLabel).map(
    ([value, label]) => ({ value, label }),
  );

  const tableRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return filteredRows;
    return filteredRows.filter((row) => {
      const hay = [
        row.featureName,
        row.userNeedName,
        row.journeyName,
        row.channelName,
        row.audienceName,
        row.momentName,
        row.product,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filteredRows, tableSearch]);

  const uniqueFeatureCount = useMemo(
    () => new Set(tableRows.map((r) => r.featureId)).size,
    [tableRows],
  );

  const totalPages = Math.max(1, Math.ceil(uniqueFeatureCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pagedFeatureIds = useMemo(() => {
    const ids = Array.from(new Set(tableRows.map((r) => r.featureId)));
    const start = (safePage - 1) * PAGE_SIZE;
    return new Set(ids.slice(start, start + PAGE_SIZE));
  }, [tableRows, safePage]);

  const pagedRows = useMemo(
    () => tableRows.filter((r) => pagedFeatureIds.has(r.featureId)),
    [tableRows, pagedFeatureIds],
  );

  const shownFeatureCount = pagedFeatureIds.size;

  useEffect(() => {
    setPage(1);
  }, [filteredRows, tableSearch, viewTab, layout]);

  const channelGroups = useMemo(
    () => groupByChannel(pagedRows),
    [pagedRows],
  );
  const journeyGroups = useMemo(
    () => groupByJourney(pagedRows),
    [pagedRows],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Mapa de funcionalidades › Visão geral"
        title="Mapa de Funcionalidades"
        description="Explore as funcionalidades por público, momento da jornada e canal. Entenda o que já existe, o que está em desenvolvimento e onde estão os gaps."
        actions={
          <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nova funcionalidade
          </Button>
        }
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect
              label="Público"
              value={filters.audienceIds[0] ?? ""}
              onChange={(v) => singleSelect(updateFilter, "audienceIds", v)}
              options={[{ value: "", label: "Todos" }, ...audiences]}
            />
            <FilterSelect
              label="Momento"
              value={filters.momentIds[0] ?? ""}
              onChange={(v) => singleSelect(updateFilter, "momentIds", v)}
              options={[{ value: "", label: "Todos" }, ...moments]}
            />
            <FilterSelect
              label="Jornada"
              value={filters.journeyIds[0] ?? ""}
              onChange={(v) => singleSelect(updateFilter, "journeyIds", v)}
              options={[{ value: "", label: "Todos" }, ...journeys]}
            />
            <FilterSelect
              label="Canal"
              value={filters.channelIds[0] ?? ""}
              onChange={(v) => singleSelect(updateFilter, "channelIds", v)}
              options={[{ value: "", label: "Todos" }, ...channels]}
            />
            <FilterSelect
              label="Status"
              value={filters.statuses[0] ?? ""}
              onChange={(v) =>
                updateFilter("statuses", v ? ([v] as FeatureStatus[]) : [])
              }
              options={[{ value: "", label: "Todos" }, ...statusOptions]}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setMoreFilters((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mais filtros
          </Button>
        </div>

        {moreFilters ? (
          <div className="mt-3 grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Experiência"
              value={filters.experiences[0] ?? ""}
              onChange={(v) =>
                updateFilter(
                  "experiences",
                  v ? ([v] as ExperienceLevel[]) : [],
                )
              }
              options={[{ value: "", label: "Todas" }, ...experienceOptions]}
            />
            <FilterSelect
              label="Prioridade"
              value={filters.priorities[0] ?? ""}
              onChange={(v) =>
                updateFilter("priorities", v ? ([v] as Priority[]) : [])
              }
              options={[{ value: "", label: "Todas" }, ...priorityOptions]}
            />
            <FilterSelect
              label="Produto"
              value={filters.products[0] ?? ""}
              onChange={(v) => singleSelect(updateFilter, "products", v)}
              options={[{ value: "", label: "Todos" }, ...products]}
            />
            <FilterSelect
              label="Responsável"
              value={filters.responsibles[0] ?? ""}
              onChange={(v) => singleSelect(updateFilter, "responsibles", v)}
              options={[{ value: "", label: "Todos" }, ...responsibles]}
            />
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        ) : null}
      </SurfaceCard>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <UnderlineTabs
          value={viewTab}
          onChange={(id) => setViewTab(id as ViewTab)}
          options={viewTabs.map((t) => ({ id: t.id, label: t.label }))}
          className="border-b-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Buscar na tabela..."
              className="h-9 w-full rounded-lg border border-[var(--border)] bg-white pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)] sm:w-56"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setLayout("matrix")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                layout === "matrix"
                  ? "bg-[var(--brand)] text-white"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Matriz
            </button>
            <button
              type="button"
              onClick={() => setLayout("table")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                layout === "table"
                  ? "bg-[var(--brand)] text-white"
                  : "text-slate-600 hover:bg-slate-50",
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="Nenhum resultado"
          description="Nenhuma funcionalidade corresponde aos filtros selecionados."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          }
        />
      ) : viewTab === "channel" ? (
        <div className="space-y-6">
          {channelGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    group.temporal === "FUTURE"
                      ? "text-[var(--accent)]"
                      : "text-slate-900",
                  )}
                >
                  {group.temporal === "FUTURE" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      {group.channelName}{" "}
                      <span className="text-[11px] font-semibold uppercase">
                        (EM BREVE)
                      </span>
                    </span>
                  ) : (
                    group.channelName
                  )}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {group.featureCount} funcionalidade(s) · {group.rows.length}{" "}
                  contexto(s)
                </p>
              </div>
              {layout === "matrix" ? (
                <FeatureMatrix rows={group.rows} />
              ) : (
                <SurfaceCard>
                  <ChannelList rows={group.rows} />
                </SurfaceCard>
              )}
            </section>
          ))}
        </div>
      ) : viewTab === "journey" ? (
        <div className="space-y-6">
          {journeyGroups.map((group, index) => (
            <section key={group.id} className="space-y-3">
              <div
                className={cn(
                  "border-l-4 pl-3",
                  [
                    "border-l-[#145fab]",
                    "border-l-[#406c3d]",
                    "border-l-[#f39300]",
                    "border-l-[#b26f9b]",
                    "border-l-[#00b5e5]",
                    "border-l-[#ef765e]",
                  ][index % 6],
                )}
              >
                <p className="text-sm font-semibold text-slate-900">
                  {group.journeyName}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {group.needCount} necessidade(s) · {group.featureCount}{" "}
                  funcionalidade(s)
                </p>
              </div>
              {layout === "matrix" ? (
                <FeatureMatrix rows={group.rows} />
              ) : (
                <SurfaceCard>
                  <ChannelList rows={group.rows} />
                </SurfaceCard>
              )}
            </section>
          ))}
        </div>
      ) : layout === "matrix" ? (
        <FeatureMatrix rows={pagedRows} />
      ) : (
        <SurfaceCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                <tr>
                  <th className="px-3 py-3">Público</th>
                  <th className="px-3 py-3">Momento</th>
                  <th className="px-3 py-3">Jornada</th>
                  <th className="px-3 py-3">Necessidade</th>
                  <th className="px-3 py-3">Funcionalidade</th>
                  <th className="px-3 py-3">Canal</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Experiência</th>
                  <th className="px-3 py-3">Prioridade</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <FeatureRow key={row.featureChannelContextId} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      {filteredRows.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--muted-foreground)]">
              Mostrando {shownFeatureCount} de {uniqueFeatureCount}{" "}
              funcionalidades
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-slate-600 disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-8 px-2 text-center text-xs font-medium text-slate-700 tabular-nums">
                {safePage}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white text-slate-600 disabled:opacity-40"
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <SurfaceCard className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Legenda de status da funcionalidade
              </p>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {FEATURE_STATUS_ORDER.map((status) => (
                  <li
                    key={status}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                  >
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        legendDot[status],
                      )}
                    />
                    {featureStatusLabel[status]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="shrink-0">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Situação do canal
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                  Atual
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-medium text-[var(--accent)]">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Em breve
                </span>
              </div>
            </div>
          </SurfaceCard>
        </>
      ) : null}

      <NovaFuncionalidadeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        audiences={audiences}
        moments={moments}
        journeys={journeys}
        channels={channels}
      />
    </div>
  );
}

function ChannelList({ rows }: { rows: FeatureMapRow[] }) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((row) => (
        <div
          key={row.featureChannelContextId}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <Link
              href={`/funcionalidades/${row.featureId}`}
              className="text-sm font-medium text-[var(--brand)] hover:underline"
            >
              {row.featureName}
            </Link>
            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
              {row.audienceName} · {row.momentName} · {row.userNeedName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{row.channelName}</span>
            <StatusBadge status={row.status} />
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Ações"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
