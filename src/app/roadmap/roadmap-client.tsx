"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { upsertRoadmapItem } from "@/app/actions/crud";
import { StatusBadge } from "@/components/badges/status-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import {
  RoadmapEditModal,
  type RoadmapEditable,
} from "@/app/roadmap/roadmap-edit-modal";
import {
  FilterSelect,
  PageHeader,
  SectionTitle,
  SegmentedControl,
  StatCard,
  SurfaceCard,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import {
  FEATURE_STATUS_ORDER,
  featureStatusLabel,
  featureStatusOptions,
  phaseDisplayName,
} from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import type {
  FeatureStatus,
  Priority,
  RoadmapPhase,
  RoadmapPhaseDef,
} from "@/types";
import {
  Download,
  GripVertical,
  Milestone,
  RefreshCw,
  Search,
} from "lucide-react";

export type RoadmapCard = {
  id: string;
  featureId: string;
  featureName: string;
  phase: RoadmapPhase;
  status: FeatureStatus | null;
  startDate: string | null;
  expectedDate: string | null;
  actualDate: string | null;
  responsible: string;
  notes: string;
  channelContextId: string | null;
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  channelId: string;
  channelName: string | null;
  priority: Priority;
};

type ViewMode = "timeline" | "kanban" | "lista";

function quarterLabel(dateStr: string | null): string {
  if (!dateStr) return "Sem data";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Sem data";
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
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

function itemInPeriod(item: RoadmapCard, cutoff: Date): boolean {
  const candidates = [item.expectedDate, item.startDate, item.actualDate].filter(
    Boolean,
  ) as string[];
  if (candidates.length === 0) return true;
  return candidates.some((raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return true;
    return date >= cutoff;
  });
}

function RoadmapItemCard({
  item,
  onOpen,
  dragging,
  phases,
}: {
  item: RoadmapCard;
  onOpen: (item: RoadmapCard) => void;
  dragging?: boolean;
  phases?: { code: string; name: string }[];
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-white p-3 text-left shadow-[var(--shadow-sm)] transition-shadow",
        "hover:border-[var(--brand)]/40 hover:shadow-md",
        dragging && "opacity-80 ring-2 ring-[var(--brand)]",
      )}
    >
      <div className="flex items-start justify-between gap-2 pr-6">
        <span className="text-sm font-semibold text-[var(--brand)]">
          {item.featureName}
        </span>
        <PriorityBadge priority={item.priority} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={item.status ?? item.phase} />
        {item.channelName ? (
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {item.channelName}
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
        Início {formatDate(item.startDate)} · Prev.{" "}
        {formatDate(item.expectedDate)}
      </p>
      {item.audienceName ? (
        <p className="mt-1 text-[11px] text-slate-400">
          {item.audienceName} · {item.momentName}
        </p>
      ) : null}
    </button>
  );
}

function DraggableCard({
  item,
  onOpen,
  disabled,
  phases,
}: {
  item: RoadmapCard;
  onOpen: (item: RoadmapCard) => void;
  disabled?: boolean;
  phases?: { code: string; name: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { item },
      disabled,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "opacity-40")}
    >
      {!disabled ? (
        <button
          type="button"
          className="absolute top-2 right-2 z-10 rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Arrastar"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <RoadmapItemCard
        item={item}
        onOpen={onOpen}
        dragging={isDragging}
        phases={phases}
      />
    </div>
  );
}

function KanbanColumn({
  phase,
  phaseName,
  items,
  channelGroups,
  onOpen,
  canEdit,
  phases,
}: {
  phase: RoadmapPhase;
  phaseName: string;
  items: RoadmapCard[];
  channelGroups?: { id: string; label: string; items: RoadmapCard[] }[] | null;
  onOpen: (item: RoadmapCard) => void;
  canEdit: boolean;
  phases?: { code: string; name: string; symbol?: string }[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-64 shrink-0 rounded-xl border border-[var(--border)] bg-slate-50/80 p-3 transition-colors",
        phase === "AVAILABLE" && "w-72",
        isOver && "border-[var(--brand)] bg-[var(--brand-soft)]/50",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">
          {phaseName}
        </p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
          {items.length}
        </span>
      </div>
      <div className="min-h-[80px] space-y-2">
        {channelGroups && channelGroups.length > 0 ? (
          channelGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="rounded-md bg-white/80 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase ring-1 ring-slate-200">
                {group.label}
              </p>
              {group.items.map((item) => (
                <DraggableCard
                  key={item.id}
                  item={item}
                  onOpen={onOpen}
                  disabled={!canEdit}
                  phases={phases}
                />
              ))}
            </div>
          ))
        ) : (
          <>
            {items.map((item) => (
              <DraggableCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                disabled={!canEdit}
                phases={phases}
              />
            ))}
            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-2 py-6 text-center text-[11px] text-slate-400">
                Solte aqui
              </p>
            ) : null}
          </>
        )}
        {channelGroups && channelGroups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-2 py-6 text-center text-[11px] text-slate-400">
            Solte aqui · disponível por canal
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function RoadmapClient({
  items: initialItems,
  audiences,
  moments,
  channels = [],
  phases,
  canEdit = false,
}: {
  items: RoadmapCard[];
  audiences: { id: string; name: string }[];
  moments: { id: string; name: string }[];
  channels?: { id: string; name: string }[];
  phases: RoadmapPhaseDef[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [audienceId, setAudienceId] = useState("");
  const [momentId, setMomentId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("timeline");
  const [editing, setEditing] = useState<RoadmapCard | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(period);
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (audienceId && item.audienceId !== audienceId) return false;
      if (momentId && item.momentId !== momentId) return false;
      if (channelId && item.channelId !== channelId) return false;
      if (
        status &&
        item.status !== status &&
        item.phase !== status
      )
        return false;
      if (cutoff && !itemInPeriod(item, cutoff)) return false;
      if (
        q &&
        !item.featureName.toLowerCase().includes(q) &&
        !item.responsible.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, audienceId, momentId, channelId, status, period, search]);

  const byQuarter = useMemo(() => {
    const map = new Map<string, RoadmapCard[]>();
    for (const item of filtered) {
      const key = quarterLabel(item.expectedDate ?? item.startDate);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        String(a.expectedDate ?? a.startDate ?? "").localeCompare(
          String(b.expectedDate ?? b.startDate ?? ""),
        ),
      );
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "Sem data") return 1;
      if (b === "Sem data") return -1;
      return a.localeCompare(b);
    });
    return keys.map((key) => ({ key, items: map.get(key) ?? [] }));
  }, [filtered]);

  const phaseOrder = useMemo(
    () => [...FEATURE_STATUS_ORDER],
    [],
  );

  const phaseNameByCode = useMemo(() => {
    const map = new Map(
      FEATURE_STATUS_ORDER.map((code) => [code, featureStatusLabel[code]]),
    );
    return map;
  }, []);

  const phaseOptions = useMemo(
    () =>
      featureStatusOptions().map((o) => ({
        code: o.value,
        name: o.label,
        symbol: "",
      })),
    [],
  );

  const byPhase = useMemo(() => {
    return phaseOrder.map((phase) => {
      const phaseItems = filtered.filter((i) => i.phase === phase);
      const channelGroups =
        phase === "AVAILABLE"
          ? Array.from(
              phaseItems.reduce((map, item) => {
                const key = item.channelId || "none";
                const label = item.channelName || "Sem canal";
                const list = map.get(key) ?? { label, items: [] as RoadmapCard[] };
                list.items.push(item);
                map.set(key, list);
                return map;
              }, new Map<string, { label: string; items: RoadmapCard[] }>()),
            ).map(([id, group]) => ({
              id,
              label: group.label,
              items: group.items,
            }))
          : null;
      return {
        phase,
        name: phaseNameByCode.get(phase) ?? phaseDisplayName(phase),
        symbol: phases.find((p) => p.code === phase)?.symbol ?? "",
        items: phaseItems,
        channelGroups,
      };
    });
  }, [filtered, phaseOrder, phaseNameByCode, phases]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(
      FEATURE_STATUS_ORDER.map((s) => [s, 0]),
    ) as Record<FeatureStatus, number>;
    for (const item of filtered) {
      const key = (item.status ?? item.phase) as FeatureStatus;
      if (key in counts) counts[key] += 1;
    }
    return counts;
  }, [filtered]);

  const nextMilestones = filtered
    .filter((i) => i.expectedDate)
    .sort((a, b) =>
      String(a.expectedDate).localeCompare(String(b.expectedDate)),
    )
    .slice(0, 5);

  const activeItem = activeId
    ? (items.find((i) => i.id === activeId) ?? null)
    : null;

  function clearFilters() {
    setAudienceId("");
    setMomentId("");
    setChannelId("");
    setStatus("");
    setPeriod("");
    setSearch("");
  }

  function openEdit(item: RoadmapCard) {
    setEditing(item);
  }

  function persistPhase(item: RoadmapCard, phase: RoadmapPhase) {
    const previous = items;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, phase, status: phase as FeatureStatus } : row,
      ),
    );

    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", item.id);
      fd.set("feature_id", item.featureId);
      if (item.channelContextId) {
        fd.set("channel_context_id", item.channelContextId);
      }
      fd.set("phase", phase);
      if (item.startDate) fd.set("start_date", item.startDate.slice(0, 10));
      if (item.expectedDate) {
        fd.set("expected_date", item.expectedDate.slice(0, 10));
      }
      if (item.actualDate) fd.set("actual_date", item.actualDate.slice(0, 10));
      fd.set("responsible", item.responsible);
      fd.set("notes", item.notes);
      fd.set("active", "true");

      const result = await upsertRoadmapItem(fd);
      if (!result.ok) {
        setItems(previous);
        alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !canEdit) return;

    const item = items.find((i) => i.id === active.id);
    if (!item) return;

    const overId = String(over.id);
    const nextPhase = (
      (FEATURE_STATUS_ORDER as readonly string[]).includes(overId)
        ? overId
        : items.find((i) => i.id === overId)?.phase
    ) as RoadmapPhase | undefined;

    if (!nextPhase || nextPhase === item.phase) return;
    persistPhase(item, nextPhase);
  }

  const editable: RoadmapEditable | null = editing
    ? {
        id: editing.id,
        featureId: editing.featureId,
        featureName: editing.featureName,
        phase: editing.phase,
        startDate: editing.startDate,
        expectedDate: editing.expectedDate,
        actualDate: editing.actualDate,
        responsible: editing.responsible,
        notes: editing.notes,
        channelContextId: editing.channelContextId,
      }
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Roadmap › Visão geral"
        title="Roadmap"
        description="Acompanhe a evolução das funcionalidades por canal, do planejamento ao go-live."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </div>
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
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todos" },
              ...phaseOptions.map((p) => ({
                value: p.code,
                label: p.name,
              })),
            ]}
            className="min-w-[150px]"
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
              placeholder="Funcionalidade ou responsável"
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
          onChange={(id) => setView(id as ViewMode)}
          options={[
            { id: "timeline", label: "Timeline" },
            { id: "kanban", label: "Kanban" },
            { id: "lista", label: "Lista" },
          ]}
        />
        {pending ? (
          <p className="text-xs text-slate-500">Salvando alteração…</p>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <SurfaceCard className="p-6 text-sm text-[var(--muted-foreground)]">
              Nenhum item de roadmap com os filtros atuais.
            </SurfaceCard>
          ) : view === "timeline" ? (
            byQuarter.map((group) => (
              <SurfaceCard key={group.key} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {group.key}
                    </h2>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {group.items.length}{" "}
                      {group.items.length === 1
                        ? "funcionalidade"
                        : "funcionalidades"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <RoadmapItemCard
                      key={item.id}
                      item={item}
                      onOpen={openEdit}
                      phases={phaseOptions}
                    />
                  ))}
                </div>
              </SurfaceCard>
            ))
          ) : view === "kanban" ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <div className="flex gap-3 overflow-x-auto pb-2">
                {byPhase.map((col) => (
                  <KanbanColumn
                    key={col.phase}
                    phase={col.phase}
                    phaseName={col.name}
                    items={col.items}
                    channelGroups={col.channelGroups}
                    onOpen={openEdit}
                    canEdit={canEdit}
                    phases={phaseOptions}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeItem ? (
                  <div className="w-64">
                    <RoadmapItemCard
                      item={activeItem}
                      onOpen={() => undefined}
                      dragging
                      phases={phaseOptions}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <SurfaceCard className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                  <tr>
                    <th className="px-4 py-3">Funcionalidade</th>
                    <th className="px-4 py-3">Público</th>
                    <th className="px-4 py-3">Momento</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Previsão</th>
                    <th className="px-4 py-3">Responsável</th>
                    <th className="px-4 py-3">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openEdit(item)}
                      className="cursor-pointer border-t border-[var(--border)] hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/funcionalidades/${item.featureId}`}
                          className="font-medium text-[var(--brand)] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.featureName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{item.audienceName}</td>
                      <td className="px-4 py-3">{item.momentName}</td>
                      <td className="px-4 py-3">{item.channelName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={item.status ?? item.phase} />
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDate(item.expectedDate)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {item.responsible || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={item.priority} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SurfaceCard>
          )}
        </div>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <SurfaceCard className="p-4">
            <SectionTitle>Resumo do roadmap</SectionTitle>
            <div className="space-y-2">
              {FEATURE_STATUS_ORDER.map((status) => (
                <StatCard
                  key={status}
                  label={featureStatusLabel[status]}
                  value={statusCounts[status]}
                  icon={status === "BACKLOG" ? Milestone : undefined}
                  tone={
                    status === "AVAILABLE"
                      ? "success"
                      : status === "DEVELOPMENT" || status === "HOMOLOGATION"
                        ? "warning"
                        : status === "UX_UI"
                          ? "accent"
                          : "default"
                  }
                />
              ))}
            </div>
          </SurfaceCard>
          <SurfaceCard className="p-4">
            <SectionTitle>Próximos marcos</SectionTitle>
            <ul className="space-y-2">
              {nextMilestones.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-900">
                      {item.featureName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.channelName ?? "—"} · {formatDate(item.expectedDate)}
                    </p>
                  </button>
                </li>
              ))}
              {nextMilestones.length === 0 ? (
                <li className="text-sm text-[var(--muted-foreground)]">
                  Sem datas previstas.
                </li>
              ) : null}
            </ul>
          </SurfaceCard>
        </aside>
      </div>

      {editable ? (
        <RoadmapEditModal
          item={editable}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
        />
      ) : null}

    </div>
  );
}
