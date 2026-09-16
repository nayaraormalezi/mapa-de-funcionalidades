"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertFeatureChannelContext,
  upsertFeatureEvolution,
} from "@/app/actions/crud";
import { RoadmapEvolutionDrawer } from "@/app/roadmap/roadmap-evolution-drawer";
import { RoadmapFeatureDrawer } from "@/app/roadmap/roadmap-feature-drawer";
import { RoadmapKanban } from "@/app/roadmap/roadmap-kanban";
import { RoadmapListaView } from "@/app/roadmap/roadmap-lista";
import { RoadmapTimelineView } from "@/app/roadmap/roadmap-timeline-view";
import {
  activeEvolutions,
  implInPeriod,
  periodCutoff,
  type FeatureEvolution,
  type RoadmapImpl,
  type RoadmapViewMode,
} from "@/app/roadmap/roadmap-types";
import {
  FilterSelect,
  PageHeader,
  SegmentedControl,
  SurfaceCard,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import {
  evolutionPhaseOptions,
  featureStageOptions,
  priorityLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  EvolutionPhase,
  Priority,
  RoadmapPhase,
  RoadmapPhaseDef,
} from "@/types";
import { Download, RefreshCw, Search } from "lucide-react";

export type RoadmapCard = RoadmapImpl;

export function RoadmapClient({
  items: initialItems,
  audiences,
  moments,
  channels = [],
  canEdit = false,
}: {
  items: RoadmapImpl[];
  audiences: { id: string; name: string }[];
  moments: { id: string; name: string }[];
  channels?: { id: string; name: string }[];
  phases?: RoadmapPhaseDef[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [phaseOverrides, setPhaseOverrides] = useState<
    Record<string, RoadmapPhase>
  >({});
  const [evoOverrides, setEvoOverrides] = useState<
    Record<string, Partial<FeatureEvolution>>
  >({});
  const [audienceId, setAudienceId] = useState("");
  const [momentId, setMomentId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [phase, setPhase] = useState("");
  const [period, setPeriod] = useState("");
  const [priority, setPriority] = useState("");
  const [evolutionFilter, setEvolutionFilter] = useState("");
  const [evolutionPhase, setEvolutionPhase] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<RoadmapViewMode>("kanban");
  const [drawerFeatureId, setDrawerFeatureId] = useState<string | null>(null);
  const [selectedEvolution, setSelectedEvolution] = useState<{
    item: RoadmapImpl;
    evo: FeatureEvolution;
  } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      initialItems.map((item) => {
        const withPhase = phaseOverrides[item.id]
          ? { ...item, phase: phaseOverrides[item.id] }
          : item;
        return {
          ...withPhase,
          evolutions: withPhase.evolutions.map((e) =>
            evoOverrides[e.id] ? { ...e, ...evoOverrides[e.id] } : e,
          ),
        };
      }),
    [initialItems, phaseOverrides, evoOverrides],
  );

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(period);
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (audienceId && item.audienceId !== audienceId) return false;
      if (momentId && item.momentId !== momentId) return false;
      if (channelId && item.channelId !== channelId) return false;
      if (priority && item.priority !== priority) return false;
      if (cutoff && !implInPeriod(item, cutoff)) return false;

      const active = activeEvolutions(item);
      if (evolutionFilter === "with" && active.length === 0) return false;
      if (evolutionFilter === "without" && active.length > 0) return false;
      if (evolutionPhase && !active.some((e) => e.phase === evolutionPhase)) {
        return false;
      }

      if (phase) {
        const matchImpl = item.phase === phase;
        const matchEvo = active.some((e) => e.phase === phase);
        if (!matchImpl && !matchEvo) return false;
      }

      if (q) {
        const hay = [
          item.featureName,
          item.channelName,
          item.responsible,
          item.audienceName,
          item.momentName,
          ...item.evolutions.map(
            (e) => `${e.title} ${e.description} ${e.responsible}`,
          ),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    items,
    audienceId,
    momentId,
    channelId,
    phase,
    priority,
    period,
    search,
    evolutionFilter,
    evolutionPhase,
  ]);

  const kpis = useMemo(() => {
    const countEvo = (p: string) =>
      filtered.reduce(
        (acc, item) =>
          acc + activeEvolutions(item).filter((e) => e.phase === p).length,
        0,
      );
    return {
      total: filtered.length,
      uxuiImpl: filtered.filter((i) => i.phase === "UX_UI").length,
      uxuiEvo: countEvo("UX_UI"),
      developmentImpl: filtered.filter((i) => i.phase === "DEVELOPMENT").length,
      developmentEvo: countEvo("DEVELOPMENT"),
      homologationImpl: filtered.filter((i) => i.phase === "HOMOLOGATION")
        .length,
      homologationEvo: countEvo("HOMOLOGATION"),
      available: filtered.filter((i) => i.phase === "AVAILABLE").length,
      evolutionsInProgress: filtered.reduce(
        (acc, item) => acc + activeEvolutions(item).length,
        0,
      ),
    };
  }, [filtered]);

  const drawerContexts = useMemo(() => {
    if (!drawerFeatureId) return [];
    return items
      .filter((i) => i.featureId === drawerFeatureId)
      .slice()
      .sort((a, b) => a.channelName.localeCompare(b.channelName));
  }, [items, drawerFeatureId]);

  function clearFilters() {
    setAudienceId("");
    setMomentId("");
    setChannelId("");
    setPhase("");
    setPeriod("");
    setPriority("");
    setEvolutionFilter("");
    setEvolutionPhase("");
    setSearch("");
  }

  function openFeature(featureId: string) {
    setSelectedEvolution(null);
    setDrawerFeatureId(featureId);
  }

  function openEvolution(item: RoadmapImpl, evo: FeatureEvolution) {
    setDrawerFeatureId(null);
    const fresh =
      items
        .find((i) => i.id === item.id)
        ?.evolutions.find((e) => e.id === evo.id) ?? evo;
    const freshItem = items.find((i) => i.id === item.id) ?? item;
    setSelectedEvolution({ item: freshItem, evo: fresh });
  }

  function movePhase(item: RoadmapImpl, nextPhase: RoadmapPhase) {
    setPhaseOverrides((prev) => ({ ...prev, [item.id]: nextPhase }));

    const fd = new FormData();
    fd.set("id", item.id);
    fd.set("feature_id", item.featureId);
    fd.set("channel_context_id", item.channelContextId);
    fd.set("phase", nextPhase);
    fd.set("status", item.status);
    fd.set("experience", item.experience);
    if (item.startDate) fd.set("start_date", item.startDate.slice(0, 10));
    if (item.expectedDate)
      fd.set("expected_date", item.expectedDate.slice(0, 10));
    if (item.launchDate) fd.set("launch_date", item.launchDate.slice(0, 10));
    fd.set("responsible", item.responsible);
    fd.set("notes", item.notes);

    startTransition(async () => {
      const result = await upsertFeatureChannelContext(fd);
      if (!result.ok) {
        setPhaseOverrides((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        alert(result.message);
        return;
      }
      setPhaseOverrides((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      router.refresh();
    });
  }

  function moveEvoPhase(
    _item: RoadmapImpl,
    evo: FeatureEvolution,
    nextPhase: EvolutionPhase,
  ) {
    let status = evo.status;
    let phase = nextPhase;

    if (evo.status === "PAUSED" && nextPhase === evo.phase) {
      status = "PAUSED";
      phase = evo.phase === "DONE" ? "HOMOLOGATION" : evo.phase;
    } else if (evo.status === "CANCELLED") {
      status = "CANCELLED";
      phase = evo.phase === "DONE" ? "HOMOLOGATION" : evo.phase;
    } else if (nextPhase === "DONE") {
      status = "DONE";
      phase = "DONE";
    } else {
      status = "IN_PROGRESS";
      phase = nextPhase;
    }

    const patch: Partial<FeatureEvolution> = { phase, status };
    setEvoOverrides((prev) => ({
      ...prev,
      [evo.id]: { ...prev[evo.id], ...patch },
    }));

    const fd = new FormData();
    fd.set("id", evo.id);
    fd.set("feature_channel_context_id", evo.featureChannelContextId);
    fd.set("title", evo.title);
    fd.set("description", evo.description);
    fd.set("phase", phase);
    fd.set("status", status);
    fd.set("priority", evo.priority);
    if (evo.startDate) fd.set("start_date", evo.startDate.slice(0, 10));
    if (evo.expectedDate) fd.set("expected_date", evo.expectedDate.slice(0, 10));
    if (status === "DONE") {
      fd.set("completed_date", new Date().toISOString().slice(0, 10));
    }
    fd.set("responsible", evo.responsible);
    fd.set("notes", evo.notes);

    startTransition(async () => {
      const result = await upsertFeatureEvolution(fd);
      if (!result.ok) {
        setEvoOverrides((prev) => {
          const next = { ...prev };
          delete next[evo.id];
          return next;
        });
        alert(result.message);
        return;
      }
      setEvoOverrides((prev) => {
        const next = { ...prev };
        delete next[evo.id];
        return next;
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumb="Roadmap › Visão geral"
        title="Roadmap"
        description="Acompanhe as etapas e status das funcionalidades."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiChip
            label="Implementações"
            value={kpis.total}
            hint="contextos de canal"
          />
          <KpiChip
            label="Em UX/UI"
            value={kpis.uxuiImpl + kpis.uxuiEvo}
            hint={`● ${kpis.uxuiImpl} · ✦ ${kpis.uxuiEvo}`}
            tone="accent"
          />
          <KpiChip
            label="Em desenvolvimento"
            value={kpis.developmentImpl + kpis.developmentEvo}
            hint={`● ${kpis.developmentImpl} · ✦ ${kpis.developmentEvo}`}
            tone="warning"
          />
          <KpiChip
            label="Em homologação"
            value={kpis.homologationImpl + kpis.homologationEvo}
            hint={`● ${kpis.homologationImpl} · ✦ ${kpis.homologationEvo}`}
            tone="warning"
          />
          <KpiChip
            label="Disponíveis"
            value={kpis.available}
            hint="só implementações"
            tone="success"
          />
          <KpiChip
            label="Evoluções em andamento"
            value={kpis.evolutionsInProgress}
            hint="iniciativas ✦"
            tone="accent"
          />
        </div>

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
              className="min-w-[140px]"
            />
            <FilterSelect
              label="Momento"
              value={momentId}
              onChange={setMomentId}
              options={[
                { value: "", label: "Todos" },
                ...moments.map((m) => ({ value: m.id, label: m.name })),
              ]}
              className="min-w-[140px]"
            />
            <FilterSelect
              label="Canal"
              value={channelId}
              onChange={setChannelId}
              options={[
                { value: "", label: "Todos" },
                ...channels.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="min-w-[140px]"
            />
            <FilterSelect
              label="Fase"
              value={phase}
              onChange={setPhase}
              options={[
                { value: "", label: "Todas" },
                ...featureStageOptions().map((p) => ({
                  value: p.value,
                  label: p.label,
                })),
              ]}
              className="min-w-[160px]"
            />
            <FilterSelect
              label="Prioridade"
              value={priority}
              onChange={setPriority}
              options={[
                { value: "", label: "Todas" },
                ...(Object.keys(priorityLabel) as Priority[]).map((key) => ({
                  value: key,
                  label: priorityLabel[key],
                })),
              ]}
              className="min-w-[140px]"
            />
            <FilterSelect
              label="Evolução"
              value={evolutionFilter}
              onChange={setEvolutionFilter}
              options={[
                { value: "", label: "Todas" },
                { value: "with", label: "Com evolução" },
                { value: "without", label: "Sem evolução" },
              ]}
              className="min-w-[150px]"
            />
            <FilterSelect
              label="Fase da evolução"
              value={evolutionPhase}
              onChange={setEvolutionPhase}
              options={[
                { value: "", label: "Todas" },
                ...evolutionPhaseOptions(false).map((p) => ({
                  value: p.value,
                  label: p.label,
                })),
              ]}
              className="min-w-[160px]"
            />
            <FilterSelect
              label="Período"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "", label: "Todos" },
                { value: "30d", label: "Últimos 30 dias" },
                { value: "90d", label: "Últimos 90 dias" },
                { value: "ytd", label: "Ano corrente" },
              ]}
              className="min-w-[150px]"
            />
            <label className="relative min-w-[180px] flex-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Busca
              </span>
              <span className="pointer-events-none absolute top-8 left-2.5 text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Funcionalidade, canal, evolução ou responsável"
                className="h-9 w-full rounded-lg border border-[var(--border)] bg-white py-1.5 pr-3 pl-8 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
              />
            </label>
            <button
              type="button"
              onClick={clearFilters}
              className="mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          </div>
        </SurfaceCard>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            value={view}
            onChange={(id) => setView(id as RoadmapViewMode)}
            options={[
              { id: "kanban", label: "Kanban" },
              { id: "timeline", label: "Timeline" },
              { id: "lista", label: "Lista" },
            ]}
          />
          {pending ? (
            <p className="text-xs text-slate-500">Salvando alteração…</p>
          ) : (
            <p className="text-xs text-slate-500">
              {filtered.length} implementações · {kpis.evolutionsInProgress}{" "}
              evoluções ativas
            </p>
          )}
        </div>

      <div className="min-w-0">
        {filtered.length === 0 ? (
          <SurfaceCard className="p-6 text-sm text-[var(--muted-foreground)]">
            Nenhum contexto de implementação com os filtros atuais.
          </SurfaceCard>
        ) : view === "kanban" ? (
          <RoadmapKanban
            items={filtered}
            canEdit={canEdit}
            onOpenFeature={openFeature}
            onOpenEvolution={openEvolution}
            onMoveImplPhase={movePhase}
            onMoveEvoPhase={moveEvoPhase}
            activeId={activeId}
            setActiveId={setActiveId}
          />
        ) : view === "timeline" ? (
          <RoadmapTimelineView
            items={filtered}
            onOpenFeature={openFeature}
            onOpenEvolution={openEvolution}
          />
        ) : (
          <RoadmapListaView
            items={filtered}
            onOpenFeature={openFeature}
            onOpenEvolution={openEvolution}
          />
        )}
      </div>

      {drawerFeatureId && drawerContexts.length > 0 ? (
        <RoadmapFeatureDrawer
          featureId={drawerFeatureId}
          featureName={drawerContexts[0].featureName}
          contexts={drawerContexts}
          canEdit={canEdit}
          onOpenEvolution={openEvolution}
          onClose={() => setDrawerFeatureId(null)}
        />
      ) : null}

      {selectedEvolution ? (
        <RoadmapEvolutionDrawer
          evo={selectedEvolution.evo}
          item={selectedEvolution.item}
          canEdit={canEdit}
          onClose={() => setSelectedEvolution(null)}
          onOpenFeature={() => {
            const featureId = selectedEvolution.item.featureId;
            setSelectedEvolution(null);
            setDrawerFeatureId(featureId);
          }}
        />
      ) : null}
    </div>
  );
}

function KpiChip({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  return (
    <SurfaceCard className="px-3.5 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums tracking-tight",
          tone === "success" && "text-emerald-700",
          tone === "warning" && "text-amber-700",
          tone === "accent" && "text-violet-700",
          tone === "default" && "text-slate-900",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>
      ) : null}
    </SurfaceCard>
  );
}
