"use client";

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
import { PriorityBadge } from "@/components/badges/priority-badge";
import {
  evolutionPhaseLabel,
  featureStageLabel,
  temporalStatusLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import {
  EXCEPTION_STAGES,
  PIPELINE_STAGES,
  activeEvolutions,
  buildKanbanCards,
  formatMonthYear,
  kanbanColumnForCard,
  type FeatureEvolution,
  type KanbanBoardCard,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";
import type { EvolutionPhase, RoadmapPhase } from "@/types";

export function RoadmapKanban({
  items,
  canEdit,
  onOpenFeature,
  onOpenEvolution,
  onMoveImplPhase,
  onMoveEvoPhase,
  activeId,
  setActiveId,
}: {
  items: RoadmapImpl[];
  canEdit: boolean;
  onOpenFeature: (featureId: string, implId?: string) => void;
  onOpenEvolution: (item: RoadmapImpl, evo: FeatureEvolution) => void;
  onMoveImplPhase: (item: RoadmapImpl, phase: RoadmapPhase) => void;
  onMoveEvoPhase: (
    item: RoadmapImpl,
    evo: FeatureEvolution,
    phase: EvolutionPhase,
  ) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const cards = buildKanbanCards(items);

  const byColumn = (phase: RoadmapPhase) =>
    cards.filter((c) => kanbanColumnForCard(c) === phase);

  const activeCard = activeId
    ? (cards.find((c) => c.id === activeId) ?? null)
    : null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !canEdit) return;

    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    const overId = String(over.id);
    const dropPhase = (
      [...PIPELINE_STAGES, ...EXCEPTION_STAGES] as string[]
    ).includes(overId)
      ? (overId as RoadmapPhase)
      : (() => {
          const overCard = cards.find((c) => c.id === overId);
          return overCard ? kanbanColumnForCard(overCard) : null;
        })();

    if (!dropPhase) return;

    if (card.kind === "impl") {
      if (dropPhase === card.item.phase) return;
      onMoveImplPhase(card.item, dropPhase);
      return;
    }

    // Evolução: AVAILABLE no board = concluir
    let nextEvo: EvolutionPhase;
    if (dropPhase === "AVAILABLE") {
      nextEvo = "DONE";
    } else if (dropPhase === "PAUSED") {
      onMoveEvoPhase(
        card.item,
        { ...card.evo, status: "PAUSED" },
        card.evo.phase === "DONE" ? "HOMOLOGATION" : card.evo.phase,
      );
      return;
    } else if (
      dropPhase === "BACKLOG" ||
      dropPhase === "UX_UI" ||
      dropPhase === "DEVELOPMENT" ||
      dropPhase === "HOMOLOGATION"
    ) {
      nextEvo = dropPhase;
    } else {
      return;
    }

    if (nextEvo === card.evo.phase && card.evo.status === "IN_PROGRESS") return;
    onMoveEvoPhase(card.item, card.evo, nextEvo);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto overflow-y-visible pb-2">
        {PIPELINE_STAGES.map((phase) => (
          <KanbanColumn
            key={phase}
            phase={phase}
            title={featureStageLabel[phase]}
            cards={byColumn(phase)}
            canEdit={canEdit}
            onOpenFeature={onOpenFeature}
            onOpenEvolution={onOpenEvolution}
            hint={
              phase === "AVAILABLE"
                ? "Implementações disponíveis · solte evolução aqui para concluir"
                : undefined
            }
          />
        ))}
        <div className="flex shrink-0 gap-3 border-l border-dashed border-slate-200 pl-3">
          {EXCEPTION_STAGES.map((phase) => (
            <KanbanColumn
              key={phase}
              phase={phase}
              title={featureStageLabel[phase]}
              cards={byColumn(phase)}
              canEdit={canEdit}
              onOpenFeature={onOpenFeature}
              onOpenEvolution={onOpenEvolution}
              muted
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="w-64">
            <BoardCardView
              card={activeCard}
              onOpenFeature={() => undefined}
              onOpenEvolution={() => undefined}
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  phase,
  title,
  cards,
  canEdit,
  onOpenFeature,
  onOpenEvolution,
  muted,
  hint,
}: {
  phase: RoadmapPhase;
  title: string;
  cards: KanbanBoardCard[];
  canEdit: boolean;
  onOpenFeature: (featureId: string, implId?: string) => void;
  onOpenEvolution: (item: RoadmapImpl, evo: FeatureEvolution) => void;
  muted?: boolean;
  hint?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase });
  const implCount = cards.filter((c) => c.kind === "impl").length;
  const evoCount = cards.filter((c) => c.kind === "evo").length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-[var(--border)] bg-slate-50/80 p-3 transition-colors",
        muted && "bg-stone-50/80",
        isOver && "border-[var(--brand)] bg-[var(--brand-soft)]/50",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
          {cards.length}
        </span>
      </div>
      {(implCount > 0 || evoCount > 0) && (
        <p className="mb-2 text-[10px] text-slate-400">
          {implCount > 0 ? `● ${implCount}` : null}
          {implCount > 0 && evoCount > 0 ? " · " : null}
          {evoCount > 0 ? `✦ ${evoCount}` : null}
        </p>
      )}
      {hint ? (
        <p className="mb-2 text-[10px] leading-snug text-slate-400">{hint}</p>
      ) : null}
      <div className="space-y-2">
        {cards.map((card) => (
          <DraggableBoardCard
            key={card.id}
            card={card}
            disabled={!canEdit}
            onOpenFeature={() =>
              onOpenFeature(card.item.featureId, card.item.id)
            }
            onOpenEvolution={() => {
              if (card.kind === "evo") {
                onOpenEvolution(card.item, card.evo);
                return;
              }
              const first = activeEvolutions(card.item)[0];
              if (first) onOpenEvolution(card.item, first);
            }}
          />
        ))}
        {cards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-2 py-6 text-center text-[11px] text-slate-400">
            Solte aqui
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DraggableBoardCard({
  card,
  disabled,
  onOpenFeature,
  onOpenEvolution,
}: {
  card: KanbanBoardCard;
  disabled?: boolean;
  onOpenFeature: () => void;
  onOpenEvolution: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      data: { card },
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
      <BoardCardView
        card={card}
        onOpenFeature={onOpenFeature}
        onOpenEvolution={onOpenEvolution}
        dragging={isDragging}
      />
    </div>
  );
}

function BoardCardView({
  card,
  onOpenFeature,
  onOpenEvolution,
  dragging,
}: {
  card: KanbanBoardCard;
  onOpenFeature: () => void;
  onOpenEvolution: () => void;
  dragging?: boolean;
}) {
  if (card.kind === "evo") {
    return (
      <button
        type="button"
        onClick={onOpenEvolution}
        className={cn(
          "w-full rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 text-left shadow-[var(--shadow-sm)] transition-shadow",
          "hover:border-amber-300 hover:shadow-md",
          dragging && "opacity-80 ring-2 ring-amber-400",
        )}
      >
        <p className="text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
          ✦ Evolução
        </p>
        <p className="mt-1 pr-5 text-sm font-semibold text-slate-900">
          {card.evo.title}
        </p>
        <p className="mt-1.5 text-xs text-slate-600">
          {card.item.featureName}
          <span className="text-slate-400"> · {card.item.channelName}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {card.item.productShortName} · {card.item.audienceName} ·{" "}
          {card.item.momentName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-amber-800">
            {evolutionPhaseLabel(card.evo.phase)}
          </span>
          <PriorityBadge priority={card.evo.priority} />
        </div>
        {card.evo.responsible ? (
          <p className="mt-2 text-[11px] text-slate-600">
            <span className="font-medium text-slate-500">Responsável:</span>{" "}
            {card.evo.responsible}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-slate-500">
          Previsão: {formatMonthYear(card.evo.expectedDate)}
        </p>
      </button>
    );
  }

  const item = card.item;
  const active = activeEvolutions(item);

  return (
    <div
      className={cn(
        "w-full rounded-xl border border-[var(--border)] bg-white p-3 text-left shadow-[var(--shadow-sm)] transition-shadow",
        "hover:border-[var(--brand)]/40 hover:shadow-md",
        dragging && "opacity-80 ring-2 ring-[var(--brand)]",
      )}
    >
      <button type="button" onClick={onOpenFeature} className="w-full text-left">
        <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          ●{" "}
          {item.phase === "AVAILABLE"
            ? "Implementação"
            : "Nova funcionalidade"}
        </p>
        <div className="mt-1 flex items-start justify-between gap-2 pr-5">
          <span className="text-sm font-semibold text-[var(--brand)]">
            {item.featureName}
          </span>
          <PriorityBadge priority={item.priority} />
        </div>
        <p className="mt-1.5 text-xs font-medium text-slate-800">
          {item.channelName}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {item.productShortName} · {item.audienceName} · {item.momentName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
            <span className="text-slate-400">●</span>
            {featureStageLabel[item.phase]}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {temporalStatusLabel[item.temporalStatus]}
          </span>
        </div>
        {item.responsible ? (
          <p className="mt-2 text-[11px] text-slate-600">
            <span className="font-medium text-slate-500">Responsável:</span>{" "}
            {item.responsible}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-slate-500">
          Previsão: {formatMonthYear(item.expectedDate)}
        </p>
      </button>

      {active.length > 0 && item.phase === "AVAILABLE" ? (
        <button
          type="button"
          onClick={() => onOpenEvolution()}
          className="mt-2.5 w-full rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-2 py-2 text-left hover:bg-amber-50"
        >
          <p className="text-[11px] font-semibold text-amber-800">
            ✦{" "}
            {active.length === 1
              ? "1 evolução em andamento"
              : `${active.length} evoluções em andamento`}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-600">
            {active[0].title} · {evolutionPhaseLabel(active[0].phase)}
          </p>
        </button>
      ) : null}
    </div>
  );
}
