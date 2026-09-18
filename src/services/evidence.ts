import {
  dedupeEvidenceByUrlWithinOwner,
  getEvidenceForOwner,
  resolveIssueEvidences,
  type EvidenceOwnerType,
} from "@/lib/evidence";
import { getDatabase } from "@/services/db";
import type { Evidence } from "@/types";

export async function getEvidenceForOwnerService(
  ownerType: EvidenceOwnerType,
  ownerId: string,
): Promise<Evidence[]> {
  const db = await getDatabase();
  return getEvidenceForOwner(db.evidences, ownerType, ownerId);
}

/**
 * Evidências da Ficha: Feature-owned + Evaluation-owned das avaliações da feature
 * + legado (featureEvolutionId da feature / featureId).
 */
export async function getFeatureSheetEvidences(
  featureId: string,
): Promise<Evidence[]> {
  const db = await getDatabase();
  const evaluationIds = new Set(
    db.featureChannelEvaluations
      .filter((e) => e.active && e.featureId === featureId)
      .map((e) => e.id),
  );
  const evolutionIds = new Set(
    db.featureEvolutions
      .filter((e) => {
        const fcc = db.featureChannelContexts.find(
          (c) => c.id === e.featureChannelContextId,
        );
        return fcc?.featureId === featureId;
      })
      .map((e) => e.id),
  );

  const related = db.evidences.filter((e) => {
    if (e.featureId === featureId) return true;
    if (e.ownerType === "FEATURE" && e.ownerId === featureId) return true;
    if (e.evaluationId && evaluationIds.has(e.evaluationId)) return true;
    if (
      e.ownerType === "EVALUATION" &&
      e.ownerId &&
      evaluationIds.has(e.ownerId)
    ) {
      return true;
    }
    if (e.featureEvolutionId && evolutionIds.has(e.featureEvolutionId)) {
      return true;
    }
    return false;
  });

  return dedupeEvidenceByUrlWithinOwner(related);
}

export async function getIssueRelatedEvidences(params: {
  featureId: string | null;
  legacyEvidenceIds: string[];
}): Promise<Evidence[]> {
  const db = await getDatabase();
  return resolveIssueEvidences({
    gapFeatureId: params.featureId,
    legacyEvidenceIds: params.legacyEvidenceIds,
    allEvidences: db.evidences,
  });
}
