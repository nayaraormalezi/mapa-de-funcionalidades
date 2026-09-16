import type {
  EvolutionPhase,
  EvolutionStatus,
  ExperienceLevel,
  FeatureEvolution,
  FeatureStatus,
  Priority,
  RoadmapPhase,
  TemporalStatus,
} from "@/types";

/** Uma implementação = funcionalidade + público + momento + canal. */
export type RoadmapImpl = {
  id: string;
  featureId: string;
  featureName: string;
  featureDescription: string;
  phase: RoadmapPhase;
  status: FeatureStatus;
  startDate: string | null;
  expectedDate: string | null;
  launchDate: string | null;
  responsible: string;
  notes: string;
  experience: ExperienceLevel;
  channelContextId: string;
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  channelId: string;
  channelName: string;
  temporalStatus: TemporalStatus;
  priority: Priority;
  journeyId: string;
  journeyName: string;
  userNeedId: string;
  userNeedName: string;
  evolutions: FeatureEvolution[];
};

export type RoadmapViewMode = "kanban" | "timeline" | "lista";

export const PIPELINE_STAGES: RoadmapPhase[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "AVAILABLE",
];

export const EXCEPTION_STAGES: RoadmapPhase[] = ["PAUSED", "REMOVED"];

export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const month = d
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
  const capitalized = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capitalized}/${d.getFullYear()}`;
}

export function periodCutoff(period: string): Date | null {
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

export function implInPeriod(item: RoadmapImpl, cutoff: Date): boolean {
  const candidates = [
    item.expectedDate,
    item.startDate,
    item.launchDate,
    ...item.evolutions.flatMap((e) => [e.expectedDate, e.startDate]),
  ].filter(Boolean) as string[];
  if (candidates.length === 0) return true;
  return candidates.some((raw) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return true;
    return date >= cutoff;
  });
}

export function activeEvolutions(item: RoadmapImpl): FeatureEvolution[] {
  return item.evolutions.filter(
    (e) =>
      e.active &&
      e.phase !== "DONE" &&
      e.status !== "DONE" &&
      e.status !== "CANCELLED" &&
      (e.status === "IN_PROGRESS" || e.status === "PAUSED"),
  );
}

export function doneEvolutions(item: RoadmapImpl): FeatureEvolution[] {
  return item.evolutions.filter(
    (e) => e.active && (e.status === "DONE" || e.phase === "DONE"),
  );
}

/** Card unificado do Kanban: implementação ou evolução. */
export type KanbanBoardCard =
  | { kind: "impl"; id: string; item: RoadmapImpl }
  | {
      kind: "evo";
      id: string;
      item: RoadmapImpl;
      evo: FeatureEvolution;
    };

export function buildKanbanCards(items: RoadmapImpl[]): KanbanBoardCard[] {
  const cards: KanbanBoardCard[] = [];
  for (const item of items) {
    cards.push({ kind: "impl", id: `impl-${item.id}`, item });
    for (const evo of activeEvolutions(item)) {
      cards.push({
        kind: "evo",
        id: `evo-${evo.id}`,
        item,
        evo,
      });
    }
  }
  return cards;
}

export function kanbanColumnForCard(card: KanbanBoardCard): RoadmapPhase {
  if (card.kind === "impl") return card.item.phase;
  if (card.evo.status === "PAUSED") return "PAUSED";
  if (card.evo.status === "CANCELLED") return "REMOVED";
  if (card.evo.phase === "DONE") return "AVAILABLE";
  return card.evo.phase as RoadmapPhase;
}

export type SiblingSummary = {
  total: number;
  evolving: number;
  available: number;
  paused: number;
  removed: number;
};

export function siblingSummary(
  items: RoadmapImpl[],
  featureId: string,
): SiblingSummary {
  const siblings = items.filter((i) => i.featureId === featureId);
  return {
    total: siblings.length,
    evolving: siblings.filter((i) =>
      ["BACKLOG", "UX_UI", "DEVELOPMENT", "HOMOLOGATION"].includes(i.phase),
    ).length,
    available: siblings.filter((i) => i.phase === "AVAILABLE").length,
    paused: siblings.filter((i) => i.phase === "PAUSED").length,
    removed: siblings.filter((i) => i.phase === "REMOVED").length,
  };
}

export function siblingSummaryLabel(summary: SiblingSummary): string {
  if (summary.total <= 1) return `${summary.total} canal`;
  const parts: string[] = [];
  if (summary.evolving > 0) parts.push(`${summary.evolving} em evolução`);
  if (summary.available > 0) {
    parts.push(
      summary.available === 1
        ? "1 disponível"
        : `${summary.available} disponíveis`,
    );
  }
  if (parts.length === 0) return `${summary.total} canais`;
  return parts.join(" · ");
}

export function groupByFeature(items: RoadmapImpl[]): {
  featureId: string;
  featureName: string;
  items: RoadmapImpl[];
}[] {
  const map = new Map<string, RoadmapImpl[]>();
  for (const item of items) {
    const list = map.get(item.featureId) ?? [];
    list.push(item);
    map.set(item.featureId, list);
  }
  return Array.from(map.entries())
    .map(([featureId, group]) => ({
      featureId,
      featureName: group[0]?.featureName ?? "",
      items: group
        .slice()
        .sort((a, b) => a.channelName.localeCompare(b.channelName)),
    }))
    .sort((a, b) => a.featureName.localeCompare(b.featureName));
}

export type { EvolutionPhase, EvolutionStatus, FeatureEvolution };
