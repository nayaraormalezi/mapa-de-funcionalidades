import { EmptyState } from "@/components/shared/empty-state";
import { phaseDisplayName } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { RoadmapItem } from "@/types";
import { Milestone } from "lucide-react";

export function RoadmapTimeline({ items }: { items: RoadmapItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Milestone}
        title="Sem roadmap"
        description="Nenhum status de roadmap registrado para esta funcionalidade."
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
