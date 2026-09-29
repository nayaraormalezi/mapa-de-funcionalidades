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
import { dateInRange, type DateRange } from "@/lib/report-period";

/** Uma implementação = funcionalidade + produto + público + momento + canal. */
export type RoadmapImpl = {
  id: string;
  featureId: string;
  featureName: string;
  featureDescription: string;
  productId: string;
  productName: string;
  productShortName: string;
  phase: RoadmapPhase;
  status: FeatureStatus;
  startDate: string | null;
  expectedDate: string | null;
  launchDate: string | null;
  responsible: string;
  /** Responsáveis estruturados da implementação (FCC). */
  responsibles?: import("@/types").WorkResponsible[];
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

/** Inclui item se alguma data cair no intervalo; sem datas → não filtra fora. */
export function implInPeriod(item: RoadmapImpl, range: DateRange): boolean {
  const candidates = [
    item.expectedDate,
    item.startDate,
    item.launchDate,
    ...item.evolutions.flatMap((e) => [e.expectedDate, e.startDate]),
  ];
  const present = candidates.filter(Boolean) as string[];
  if (present.length === 0) return true;
  return present.some((raw) => dateInRange(raw, range));
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
  productCount: number;
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
      productCount: new Set(group.map((i) => i.productId)).size,
      items: group
        .slice()
        .sort((a, b) => {
          const p = a.productName.localeCompare(b.productName);
          if (p !== 0) return p;
          return a.channelName.localeCompare(b.channelName);
        }),
    }))
    .sort((a, b) => a.featureName.localeCompare(b.featureName));
}

/** Agrupa Timeline: Funcionalidade → Produto → Canais. */
export function groupByFeatureThenProduct(items: RoadmapImpl[]): {
  featureId: string;
  featureName: string;
  products: {
    productId: string;
    productName: string;
    productShortName: string;
    items: RoadmapImpl[];
  }[];
}[] {
  return groupByFeature(items).map((group) => {
    const byProduct = new Map<string, RoadmapImpl[]>();
    for (const item of group.items) {
      const list = byProduct.get(item.productId) ?? [];
      list.push(item);
      byProduct.set(item.productId, list);
    }
    return {
      featureId: group.featureId,
      featureName: group.featureName,
      products: Array.from(byProduct.entries())
        .map(([productId, productItems]) => ({
          productId,
          productName: productItems[0]?.productName ?? "",
          productShortName: productItems[0]?.productShortName ?? "",
          items: productItems,
        }))
        .sort((a, b) => a.productName.localeCompare(b.productName)),
    };
  });
}

export type { EvolutionPhase, EvolutionStatus, FeatureEvolution };
