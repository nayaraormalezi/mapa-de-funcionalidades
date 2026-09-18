/**
 * Issues persistidas (tabela física `gaps` = Gap₂).
 *
 * Coverage Gaps NÃO passam por este service — use `detectCoverageGaps` /
 * `getCoverageGaps` / `HubCoverageGap`.
 */

import { getDatabase } from "@/services/db";
import type { Issue } from "@/types";

/** @deprecated Prefer `Issue` — alias legado Gap₂. */
export type { Gap } from "@/types";

export async function getIssues(): Promise<Issue[]> {
  return (await getDatabase()).gaps.filter((g) => {
    const record = g as Issue & { active?: boolean };
    return record.active !== false;
  });
}

export async function getOpenIssues(): Promise<Issue[]> {
  return (await getIssues()).filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  );
}

export async function getIssueById(id: string): Promise<Issue | undefined> {
  return (await getIssues()).find((g) => g.id === id);
}

export async function getFeatureIssues(featureId: string): Promise<Issue[]> {
  return (await getIssues()).filter((g) => g.featureId === featureId);
}

/** @deprecated Fase 12 — preferir `getIssues`. */
export async function getGaps(): Promise<Issue[]> {
  return getIssues();
}

/** @deprecated Fase 12 — preferir `getOpenIssues`. */
export async function getOpenGaps(): Promise<Issue[]> {
  return getOpenIssues();
}

/** @deprecated Fase 12 — preferir `getIssueById`. */
export async function getGapById(id: string): Promise<Issue | undefined> {
  return getIssueById(id);
}
