/**
 * Modelo canônico de Evidence (Fase 7).
 *
 * Evidence pertence a um owner principal:
 * - FEATURE — artefato estrutural / geral da funcionalidade
 * - EVALUATION — comprova uma FeatureChannelEvaluation
 *
 * Campos legados (userNeedId, featureEvolutionId, Gap.evidenceIds)
 * permanecem no tipo/DB mas não são fonte de verdade para ownership.
 */

import type {
  Evidence,
  EvidenceType,
  FeatureChannelEvaluation,
} from "@/types";

export type EvidenceOwnerType = "FEATURE" | "EVALUATION";

export type EvidenceOwner = {
  ownerType: EvidenceOwnerType;
  ownerId: string;
};

export const EVIDENCE_OWNER_LABEL: Record<EvidenceOwnerType, string> = {
  FEATURE: "Funcionalidade",
  EVALUATION: "Avaliação",
};

/** Resolve o owner canônico a partir do registro (inclui legado). */
export function resolveEvidenceOwner(
  evidence: Pick<
    Evidence,
    "featureId" | "evaluationId" | "ownerType" | "ownerId" | "userNeedId" | "featureEvolutionId"
  >,
): EvidenceOwner | null {
  if (
    evidence.ownerType === "EVALUATION" &&
    evidence.ownerId
  ) {
    return { ownerType: "EVALUATION", ownerId: evidence.ownerId };
  }
  if (evidence.ownerType === "FEATURE" && evidence.ownerId) {
    return { ownerType: "FEATURE", ownerId: evidence.ownerId };
  }
  if (evidence.evaluationId) {
    return { ownerType: "EVALUATION", ownerId: evidence.evaluationId };
  }
  if (evidence.featureId) {
    return { ownerType: "FEATURE", ownerId: evidence.featureId };
  }
  // Legado: só necessidade ou só evolução — sem Feature/Evaluation canônico.
  return null;
}

export function normalizeEvidenceOwnerFields(input: {
  ownerType?: string | null;
  ownerId?: string | null;
  evaluationId?: string | null;
  featureId?: string | null;
}): {
  ownerType: EvidenceOwnerType | undefined;
  ownerId: string | undefined;
  evaluationId: string | null;
  featureId: string | null;
} {
  const rawType = String(input.ownerType ?? "").trim().toUpperCase();
  const ownerId = String(input.ownerId ?? "").trim() || undefined;
  let evaluationId =
    String(input.evaluationId ?? "").trim() || null;
  let featureId = String(input.featureId ?? "").trim() || null;

  let ownerType: EvidenceOwnerType | undefined;
  if (rawType === "EVALUATION" || rawType === "FEATURE") {
    ownerType = rawType;
  } else if (evaluationId) {
    ownerType = "EVALUATION";
  } else if (featureId) {
    ownerType = "FEATURE";
  }

  if (ownerType === "EVALUATION" && ownerId) {
    evaluationId = evaluationId ?? ownerId;
  }
  if (ownerType === "FEATURE" && ownerId) {
    featureId = featureId ?? ownerId;
  }

  return {
    ownerType,
    ownerId: ownerId ?? evaluationId ?? featureId ?? undefined,
    evaluationId,
    featureId,
  };
}

export function getEvidenceForOwner(
  evidences: Evidence[],
  ownerType: EvidenceOwnerType,
  ownerId: string,
): Evidence[] {
  return evidences.filter((e) => {
    const owner = resolveEvidenceOwner(e);
    return owner?.ownerType === ownerType && owner.ownerId === ownerId;
  });
}

/** Evidências da Feature Sheet: Feature-owned + Evaluation-owned da feature. */
export function getEvidencesForFeature(
  evidences: Evidence[],
  featureId: string,
  evaluationIds: Set<string>,
): Evidence[] {
  return evidences.filter((e) => {
    const owner = resolveEvidenceOwner(e);
    if (!owner) {
      // Legado órfão com featureId nulo mas evolution da feature — já filtrado no service.
      return e.featureId === featureId;
    }
    if (owner.ownerType === "FEATURE") return owner.ownerId === featureId;
    if (owner.ownerType === "EVALUATION") {
      return evaluationIds.has(owner.ownerId);
    }
    return false;
  });
}

/**
 * Deduplicação por URL **dentro do mesmo owner**.
 * A mesma URL em owners diferentes é legítima.
 */
export function dedupeEvidenceByUrlWithinOwner(
  evidences: Evidence[],
): Evidence[] {
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const e of evidences) {
    const owner = resolveEvidenceOwner(e);
    const href = (e.link || e.fileUrl || "").trim();
    if (!href || !owner) {
      out.push(e);
      continue;
    }
    const key = `${owner.ownerType}:${owner.ownerId}:${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/** Anexos embutidos na Evaluation (legado paralelo — não são rows de evidences). */
export type EvaluationEmbeddedAttachment = {
  id: string;
  evaluationId: string;
  evaluationName: string;
  kind: "research" | "report" | "figma" | "file";
  label: string;
  href: string | null;
  fileName?: string | null;
  filePath?: string | null;
  fileMime?: string | null;
  fileSize?: number | null;
};

const EMBEDDED_KIND_META: Record<
  EvaluationEmbeddedAttachment["kind"],
  { label: string; type: EvidenceType }
> = {
  research: { label: "Link da pesquisa", type: "UX_RESEARCH" },
  report: { label: "Relatório", type: "OTHER" },
  figma: { label: "Figma", type: "OTHER" },
  file: { label: "Arquivo anexado", type: "OTHER" },
};

export function listEvaluationEmbeddedAttachments(
  evaluation: FeatureChannelEvaluation,
): EvaluationEmbeddedAttachment[] {
  const items: EvaluationEmbeddedAttachment[] = [];
  if (evaluation.researchUrl) {
    items.push({
      id: `${evaluation.id}-research`,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name,
      kind: "research",
      label: EMBEDDED_KIND_META.research.label,
      href: evaluation.researchUrl,
    });
  }
  if (evaluation.reportUrl) {
    items.push({
      id: `${evaluation.id}-report`,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name,
      kind: "report",
      label: EMBEDDED_KIND_META.report.label,
      href: evaluation.reportUrl,
    });
  }
  if (evaluation.figmaUrl) {
    items.push({
      id: `${evaluation.id}-figma`,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name,
      kind: "figma",
      label: EMBEDDED_KIND_META.figma.label,
      href: evaluation.figmaUrl,
    });
  }
  if (
    evaluation.evidenceFileName ||
    evaluation.evidenceFileUrl ||
    evaluation.evidenceFilePath
  ) {
    items.push({
      id: `${evaluation.id}-file`,
      evaluationId: evaluation.id,
      evaluationName: evaluation.name,
      kind: "file",
      label: evaluation.evidenceFileName ?? EMBEDDED_KIND_META.file.label,
      href: evaluation.evidenceFileUrl ?? null,
      fileName: evaluation.evidenceFileName,
      filePath: evaluation.evidenceFilePath,
      fileMime: evaluation.evidenceFileMime,
      fileSize: evaluation.evidenceFileSize,
    });
  }
  return items;
}

/** ID determinístico da Evidence materializada (idempotente). */
export function materializedEvidenceId(
  evaluationId: string,
  kind: EvaluationEmbeddedAttachment["kind"],
): string {
  return `evm-${evaluationId}-${kind}`;
}

export type MaterializedEvidenceDraft = {
  id: string;
  ownerType: "EVALUATION";
  ownerId: string;
  evaluationId: string;
  featureId: string;
  title: string;
  type: EvidenceType;
  description: string;
  link: string | null;
  date: string;
  responsible: string;
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  kind: EvaluationEmbeddedAttachment["kind"];
};

/**
 * Converte anexos elegíveis da Evaluation em drafts de Evidence.
 * Títulos/tipos são labels estruturais do campo — não inventa conteúdo de pesquisa.
 */
export function buildMaterializedEvidenceDrafts(
  evaluation: FeatureChannelEvaluation,
): MaterializedEvidenceDraft[] {
  const date =
    evaluation.evaluatedAt?.slice(0, 10) ||
    evaluation.createdAt?.slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  return listEvaluationEmbeddedAttachments(evaluation).map((att) => {
    const meta = EMBEDDED_KIND_META[att.kind];
    return {
      id: materializedEvidenceId(evaluation.id, att.kind),
      ownerType: "EVALUATION" as const,
      ownerId: evaluation.id,
      evaluationId: evaluation.id,
      featureId: evaluation.featureId,
      title: att.kind === "file" && att.fileName ? att.fileName : meta.label,
      type: meta.type,
      description: "",
      link: att.kind === "file" ? null : att.href,
      date,
      responsible: evaluation.responsible || "",
      filePath: att.filePath ?? null,
      fileName: att.fileName ?? null,
      fileMime: att.fileMime ?? null,
      fileSize: att.fileSize ?? null,
      kind: att.kind,
    };
  });
}

/** Evita materializar de novo se já existe Evidence do mesmo owner+kind/link/file. */
export function filterDraftsNotYetMaterialized(
  drafts: MaterializedEvidenceDraft[],
  existing: Evidence[],
): MaterializedEvidenceDraft[] {
  return drafts.filter((draft) => {
    if (existing.some((e) => e.id === draft.id)) return false;
    return !existing.some((e) => {
      const owner = resolveEvidenceOwner(e);
      if (owner?.ownerType !== "EVALUATION" || owner.ownerId !== draft.ownerId) {
        return false;
      }
      if (draft.link && (e.link || "").trim() === draft.link.trim()) return true;
      if (
        draft.filePath &&
        e.filePath &&
        e.filePath === draft.filePath
      ) {
        return true;
      }
      if (
        draft.kind === "file" &&
        draft.fileName &&
        e.fileName === draft.fileName &&
        !e.link
      ) {
        return true;
      }
      return false;
    });
  });
}

/**
 * Anexos legados ainda não cobertos por Evidence canônica
 * (para UI de transição sem duplicar visualmente).
 */
export function filterEmbeddedNotYetMaterialized(
  attachments: EvaluationEmbeddedAttachment[],
  evidences: Evidence[],
): EvaluationEmbeddedAttachment[] {
  return attachments.filter((att) => {
    const matId = materializedEvidenceId(att.evaluationId, att.kind);
    if (evidences.some((e) => e.id === matId)) return false;
    return !evidences.some((e) => {
      const owner = resolveEvidenceOwner(e);
      if (
        owner?.ownerType !== "EVALUATION" ||
        owner.ownerId !== att.evaluationId
      ) {
        return false;
      }
      if (att.href && (e.link || e.fileUrl || "").trim() === att.href.trim()) {
        return true;
      }
      if (att.filePath && e.filePath === att.filePath) return true;
      return false;
    });
  });
}

/**
 * Issue/Gap: preferir evidências da Feature; fallback legado evidenceIds.
 * Não escreve nem depende de Gap.evidenceIds como fonte canônica.
 */
export function resolveIssueEvidences(params: {
  gapFeatureId: string | null;
  legacyEvidenceIds: string[];
  allEvidences: Evidence[];
}): Evidence[] {
  const byId = new Map(params.allEvidences.map((e) => [e.id, e]));
  const result = new Map<string, Evidence>();

  if (params.gapFeatureId) {
    for (const e of params.allEvidences) {
      const owner = resolveEvidenceOwner(e);
      if (owner?.ownerType === "FEATURE" && owner.ownerId === params.gapFeatureId) {
        result.set(e.id, e);
      } else if (e.featureId === params.gapFeatureId) {
        result.set(e.id, e);
      }
    }
  }

  for (const id of params.legacyEvidenceIds) {
    const e = byId.get(id);
    if (e) result.set(e.id, e);
  }

  return Array.from(result.values());
}

export type EvidenceCreateInput = {
  ownerType: EvidenceOwnerType;
  ownerId: string;
  featureId?: string | null;
  title: string;
  type?: EvidenceType;
  description?: string;
  link?: string | null;
  date?: string;
  responsible?: string;
};
