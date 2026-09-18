/**
 * Hub unificado:
 * - Gaps de cobertura (derivados de Implementation/FCC)
 * - Oportunidades (Evaluation → Health baixa)
 * - Issues (ex-Gap₂, persistidas na tabela `gaps`)
 */

import { detectCoverageGaps } from "@/lib/coverage-gaps";
import {
  buildChannelIntelligence,
  type Opportunity,
} from "@/lib/evaluation-intelligence";
import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";
import { getIssues } from "@/services/gaps";
import type {
  FeatureChannelEvaluation,
  FeatureMapRow,
  Issue,
  IssueStatus,
  IssueType,
  Impact,
  Priority,
} from "@/types";

export type HubCoverageGap = {
  id: string;
  featureId: string;
  featureName: string;
  channelName: string;
  channelContextId: string;
  fccId: string;
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  productId: string;
  productShortName: string;
  phase: string;
  expectedDate: string | null;
  reason: "BACKLOG" | "NOT_PLANNED";
  title: string;
  description: string;
  href: string;
};

export type HubOpportunity = Opportunity & {
  featureId: string;
  featureName: string;
  channelName: string;
  channelContextId: string;
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  productId: string;
  productShortName: string;
  href: string;
};

/** Issue = Gap₂ persistido (tabela `gaps`). ≠ Coverage Gap. */
export type HubIssue = {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  impact: Impact;
  priority: Priority;
  status: IssueStatus;
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  journeyId: string;
  journeyName: string;
  featureId: string | null;
  featureName: string | null;
  productId: string | null;
  userNeedId: string;
  currentChannelId: string | null;
  futureChannelId: string | null;
  responsible: string;
  actionPlan: string;
  isDemo: boolean;
  href: string;
  featureHref: string | null;
};

function groupMapRowsByChannelCard(rows: FeatureMapRow[]) {
  const map = new Map<
    string,
    {
      key: string;
      featureId: string;
      featureName: string;
      channelName: string;
      audienceId: string;
      audienceName: string;
      momentId: string;
      momentName: string;
      productId: string;
      productShortName: string;
      phase: FeatureMapRow["phase"];
      expectedDate: string | null;
      primaryContext: FeatureMapRow;
    }
  >();

  for (const row of rows) {
    const key = [
      row.featureId,
      row.channelId,
      row.audienceId,
      row.momentId,
      row.phase,
    ].join("|");
    if (map.has(key)) continue;
    map.set(key, {
      key,
      featureId: row.featureId,
      featureName: row.featureName,
      channelName: row.channelName,
      audienceId: row.audienceId,
      audienceName: row.audienceName,
      momentId: row.momentId,
      momentName: row.momentName,
      productId: row.productId,
      productShortName: row.productShortName,
      phase: row.phase,
      expectedDate: row.expectedDate,
      primaryContext: row,
    });
  }
  return Array.from(map.values());
}

function contextMetaFromMapRows(mapRows: FeatureMapRow[]) {
  const byContext = new Map<
    string,
    {
      channelName: string;
      audienceId: string;
      audienceName: string;
      momentId: string;
      momentName: string;
      productId: string;
      productShortName: string;
    }
  >();
  for (const row of mapRows) {
    if (byContext.has(row.channelContextId)) continue;
    byContext.set(row.channelContextId, {
      channelName: row.channelName,
      audienceId: row.audienceId,
      audienceName: row.audienceName,
      momentId: row.momentId,
      momentName: row.momentName,
      productId: row.productId,
      productShortName: row.productShortName,
    });
  }
  return byContext;
}

function toHubIssue(
  issue: Issue,
  names: {
    audiences: Map<string, string>;
    moments: Map<string, string>;
    journeys: Map<string, string>;
    features: Map<string, string>;
  },
): HubIssue {
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    impact: issue.impact,
    priority: issue.priority,
    status: issue.status,
    audienceId: issue.audienceId,
    audienceName: names.audiences.get(issue.audienceId) ?? issue.audienceId,
    momentId: issue.momentId,
    momentName: names.moments.get(issue.momentId) ?? issue.momentId,
    journeyId: issue.journeyId,
    journeyName: names.journeys.get(issue.journeyId) ?? issue.journeyId,
    featureId: issue.featureId,
    featureName: issue.featureId
      ? (names.features.get(issue.featureId) ?? issue.featureId)
      : null,
    productId: issue.productId,
    userNeedId: issue.userNeedId,
    currentChannelId: issue.currentChannelId,
    futureChannelId: issue.futureChannelId,
    responsible: issue.responsible,
    actionPlan: issue.actionPlan,
    isDemo: issue.isDemo,
    href: `/gaps/${issue.id}`,
    featureHref: issue.featureId
      ? `/funcionalidades/${issue.featureId}`
      : null,
  };
}

/** Gaps de cobertura (Implementação / FCC). */
export async function getCoverageGaps(): Promise<HubCoverageGap[]> {
  return (await getHubSignals()).coverageGaps;
}

/** Oportunidades derivadas de avaliações. */
export async function getHubOpportunities(): Promise<HubOpportunity[]> {
  return (await getHubSignals()).opportunities;
}

/** Issues = Gap₂ persistido (tabela `gaps`). ≠ Coverage Gap. */
export async function getHubIssues(): Promise<HubIssue[]> {
  return (await getHubSignals()).issues;
}

/**
 * Carrega os três datasets do Hub numa única passagem (sem triplicar I/O).
 * Badge do menu = coverage + opportunities + issues abertas.
 */
export async function getHubSignals(): Promise<{
  coverageGaps: HubCoverageGap[];
  opportunities: HubOpportunity[];
  issues: HubIssue[];
}> {
  const [db, mapRows, issuesPersisted] = await Promise.all([
    getDatabase(),
    buildFeatureMapRows(),
    getIssues(),
  ]);

  const featureNameById = new Map(
    db.features.map((f) => [f.id, f.name] as const),
  );
  const audienceNameById = new Map(
    db.audiences.map((a) => [a.id, a.name] as const),
  );
  const momentNameById = new Map(db.moments.map((m) => [m.id, m.name] as const));
  const journeyNameById = new Map(
    db.journeys.map((j) => [j.id, j.name] as const),
  );
  const contextMeta = contextMetaFromMapRows(mapRows);

  const cards = groupMapRowsByChannelCard(mapRows);
  const coverageGaps: HubCoverageGap[] = [];

  for (const card of cards) {
    const detected = detectCoverageGaps([
      {
        key: card.key,
        channelName: card.channelName,
        phase: card.phase,
        expectedDate: card.expectedDate,
        primaryContext: {
          channelContextId: card.primaryContext.channelContextId,
          featureChannelContextId:
            card.primaryContext.featureChannelContextId,
        },
      },
    ]);
    for (const gap of detected) {
      coverageGaps.push({
        ...gap,
        featureId: card.featureId,
        featureName: featureNameById.get(card.featureId) ?? card.featureName,
        audienceId: card.audienceId,
        audienceName: card.audienceName,
        momentId: card.momentId,
        momentName: card.momentName,
        productId: card.productId,
        productShortName: card.productShortName,
        href: `/funcionalidades/${card.featureId}`,
      });
    }
  }

  const evalsByChannel = new Map<string, FeatureChannelEvaluation[]>();
  for (const ev of db.featureChannelEvaluations) {
    if (!ev.active) continue;
    const key = `${ev.featureId}::${ev.channelContextId}`;
    const list = evalsByChannel.get(key) ?? [];
    list.push(ev);
    evalsByChannel.set(key, list);
  }

  const opportunities: HubOpportunity[] = [];
  for (const [key, evaluations] of evalsByChannel) {
    const [featureId, channelContextId] = key.split("::");
    const intel = buildChannelIntelligence(evaluations);
    const featureName = featureNameById.get(featureId) ?? featureId;
    const meta = contextMeta.get(channelContextId);
    for (const op of intel.opportunities) {
      opportunities.push({
        ...op,
        featureId,
        featureName,
        channelName: meta?.channelName ?? "Canal",
        channelContextId,
        audienceId: meta?.audienceId ?? "",
        audienceName: meta?.audienceName ?? "",
        momentId: meta?.momentId ?? "",
        momentName: meta?.momentName ?? "",
        productId: meta?.productId ?? "",
        productShortName: meta?.productShortName ?? "",
        href: `/funcionalidades/${featureId}`,
      });
    }
  }

  const issues = issuesPersisted.map((gap) =>
    toHubIssue(gap, {
      audiences: audienceNameById,
      moments: momentNameById,
      journeys: journeyNameById,
      features: featureNameById,
    }),
  );

  coverageGaps.sort((a, b) =>
    a.featureName.localeCompare(b.featureName, "pt-BR"),
  );
  opportunities.sort((a, b) => {
    const sev =
      (a.severity === "CRITICAL" ? 0 : 1) - (b.severity === "CRITICAL" ? 0 : 1);
    if (sev !== 0) return sev;
    return a.featureName.localeCompare(b.featureName, "pt-BR");
  });
  issues.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return { coverageGaps, opportunities, issues };
}

/** @deprecated Prefer getHubSignals — mantido para compatibilidade. */
export async function getGapsAndOpportunitiesHub(): Promise<{
  coverageGaps: HubCoverageGap[];
  opportunities: HubOpportunity[];
}> {
  const { coverageGaps, opportunities } = await getHubSignals();
  return { coverageGaps, opportunities };
}

/** Contagem do badge do menu: Gaps de cobertura + Oportunidades + Issues abertas. */
export function hubBadgeCount(hub: {
  coverageGaps: { length: number };
  opportunities: { length: number };
  issues: { status: IssueStatus }[];
}): number {
  const openIssues = hub.issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
  ).length;
  return hub.coverageGaps.length + hub.opportunities.length + openIssues;
}
