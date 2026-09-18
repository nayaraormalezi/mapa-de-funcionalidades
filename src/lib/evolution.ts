/**
 * Regras de FeatureEvolution: origem estruturada + compatibilidade status × phase.
 */

import type {
  EvolutionOrigin,
  EvolutionPhase,
  EvolutionStatus,
} from "@/types";

export type { EvolutionOrigin };

export const EVOLUTION_ORIGINS: EvolutionOrigin[] = [
  "MANUAL",
  "COVERAGE_GAP",
  "OPPORTUNITY",
  "ISSUE",
];

export const evolutionOriginLabel: Record<EvolutionOrigin, string> = {
  MANUAL: "Manual",
  COVERAGE_GAP: "Lacuna de cobertura",
  OPPORTUNITY: "Oportunidade",
  ISSUE: "Problema",
};

const STATUS_SET = new Set<string>([
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
  "PAUSED",
]);

const PHASE_SET = new Set<string>([
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "DONE",
]);

/**
 * Matriz STATUS × PHASE (permitido = true).
 *
 * STATUS = estado da Evolution · PHASE = etapa do pipeline.
 * Regra dura: DONE em um implica DONE no outro.
 * CANCELLED/PAUSED/IN_PROGRESS: phases de pipeline (não DONE).
 */
export const EVOLUTION_STATUS_PHASE_MATRIX: Record<
  EvolutionStatus,
  Record<EvolutionPhase, boolean>
> = {
  IN_PROGRESS: {
    BACKLOG: true,
    UX_UI: true,
    DEVELOPMENT: true,
    HOMOLOGATION: true,
    DONE: false,
  },
  PAUSED: {
    BACKLOG: true,
    UX_UI: true,
    DEVELOPMENT: true,
    HOMOLOGATION: true,
    DONE: false,
  },
  CANCELLED: {
    BACKLOG: true,
    UX_UI: true,
    DEVELOPMENT: true,
    HOMOLOGATION: true,
    DONE: false,
  },
  DONE: {
    BACKLOG: false,
    UX_UI: false,
    DEVELOPMENT: false,
    HOMOLOGATION: false,
    DONE: true,
  },
};

/** Legado sem origin → MANUAL (sem inferência por título/descrição). */
export function normalizeEvolutionOrigin(
  value: string | null | undefined,
): EvolutionOrigin {
  if (
    value === "MANUAL" ||
    value === "COVERAGE_GAP" ||
    value === "OPPORTUNITY" ||
    value === "ISSUE"
  ) {
    return value;
  }
  return "MANUAL";
}

export function parseEvolutionStatus(
  value: string | null | undefined,
): EvolutionStatus {
  if (value && STATUS_SET.has(value)) return value as EvolutionStatus;
  return "IN_PROGRESS";
}

export function parseEvolutionPhase(
  value: string | null | undefined,
): EvolutionPhase {
  if (value && PHASE_SET.has(value)) return value as EvolutionPhase;
  return "BACKLOG";
}

/**
 * Alinha status × phase de forma determinística.
 * - Qualquer lado DONE → ambos DONE.
 * - Combinação inválida (ex.: DONE + HOMOLOGATION) → DONE/DONE.
 * - CANCELLED/PAUSED com phase DONE → phase HOMOLOGATION.
 */
export function reconcileEvolutionStatusPhase(
  rawStatus: string | null | undefined,
  rawPhase: string | null | undefined,
): { status: EvolutionStatus; phase: EvolutionPhase } {
  const status = parseEvolutionStatus(rawStatus);
  const phase = parseEvolutionPhase(rawPhase);

  if (status === "DONE" || phase === "DONE") {
    return { status: "DONE", phase: "DONE" };
  }

  if (!EVOLUTION_STATUS_PHASE_MATRIX[status][phase]) {
    if (status === "CANCELLED" || status === "PAUSED") {
      return { status, phase: "HOMOLOGATION" };
    }
    return { status: "IN_PROGRESS", phase };
  }

  return { status, phase };
}

export function isEvolutionStatusPhaseAllowed(
  status: EvolutionStatus,
  phase: EvolutionPhase,
): boolean {
  return EVOLUTION_STATUS_PHASE_MATRIX[status][phase] === true;
}
