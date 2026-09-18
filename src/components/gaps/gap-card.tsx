import Link from "next/link";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONCEPT_LABEL,
  issueStatusLabel,
  issueTypeLabel,
} from "@/lib/labels";
import type { Issue } from "@/types";

/** Card de Issue (persistida; tabela física `gaps`). */
export function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Card className="h-full transition-colors hover:border-[var(--brand)]">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-700 ring-1 ring-slate-200 uppercase">
            {CONCEPT_LABEL.issue}
          </span>
          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 ring-1 ring-rose-200 uppercase">
            {issueTypeLabel[issue.type]}
          </span>
          <PriorityBadge priority={issue.priority} />
          {issue.isDemo ? (
            <span className="text-[10px] font-bold text-amber-700 uppercase">
              DEMO
            </span>
          ) : null}
        </div>
        <CardTitle className="text-base">
          <Link
            href={`/gaps/${issue.id}`}
            className="hover:text-[var(--brand)] hover:underline"
          >
            {issue.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-[var(--muted-foreground)]">{issue.description}</p>
        <p>
          <span className="font-medium">Status:</span>{" "}
          {issueStatusLabel[issue.status]}
        </p>
        <p>
          <span className="font-medium">Responsável:</span> {issue.responsible}
        </p>
        <p>
          <span className="font-medium">Plano de ação:</span> {issue.actionPlan}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * @deprecated Fase 12 — preferir `IssueCard`.
 */
export function GapCard({ gap }: { gap: Issue }) {
  return <IssueCard issue={gap} />;
}
