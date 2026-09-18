import { EmptyState } from "@/components/shared/empty-state";
import { phaseDisplayName } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { RoadmapPhase } from "@/types";
import { Milestone } from "lucide-react";

/**
 * Item de timeline derivado da Implementation (FeatureChannelContext).
 * Não usa RoadmapItem como fonte de verdade.
 */
export type ImplementationTimelineItem = {
  id: string;
  phase: RoadmapPhase | string;
  startDate: string | null;
  expectedDate: string | null;
  /** Data real / lançamento (FCC.launchDate). */
  actualDate: string | null;
  responsible: string;
  notes: string;
};

export function RoadmapTimeline({
  items,
}: {
  items: ImplementationTimelineItem[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Milestone}
        title="Sem entregas"
        description="Nenhuma implementação registrada para esta funcionalidade."
        className="py-8"
      />
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-[var(--border)] pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute top-1.5 -left-[1.4rem] h-2.5 w-2.5 rounded-full bg-[var(--brand)] ring-4 ring-[var(--surface)]" />
          <p className="text-sm font-semibold">
            {phaseDisplayName(item.phase)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Início: {formatDate(item.startDate)} · Previsão:{" "}
            {formatDate(item.expectedDate)} · Real:{" "}
            {formatDate(item.actualDate)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Responsável: {item.responsible}
          </p>
          {item.notes ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {item.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
