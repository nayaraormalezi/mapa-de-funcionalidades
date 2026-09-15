import Link from "next/link";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gapStatusLabel, gapTypeLabel } from "@/lib/labels";
import type { Gap } from "@/types";

export function GapCard({ gap }: { gap: Gap }) {
  return (
    <Card className="h-full transition-colors hover:border-[var(--brand)]">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 ring-1 ring-rose-200 uppercase">
            {gapTypeLabel[gap.type]}
          </span>
          <PriorityBadge priority={gap.priority} />
          {gap.isDemo ? (
            <span className="text-[10px] font-bold text-amber-700 uppercase">
              DEMO
            </span>
          ) : null}
        </div>
        <CardTitle className="text-base">
          <Link
            href={`/gaps/${gap.id}`}
            className="hover:text-[var(--brand)] hover:underline"
          >
            {gap.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-[var(--muted-foreground)]">{gap.description}</p>
        <p>
          <span className="font-medium">Status:</span>{" "}
          {gapStatusLabel[gap.status]}
        </p>
        <p>
          <span className="font-medium">Responsável:</span> {gap.responsible}
        </p>
        <p>
          <span className="font-medium">Plano de ação:</span> {gap.actionPlan}
        </p>
      </CardContent>
    </Card>
  );
}
