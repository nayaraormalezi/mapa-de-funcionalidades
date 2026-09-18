/**
 * Governança configurável da inteligência de avaliações.
 * Pesos, benchmarks e periodicidade — não hardcoded como regra de negócio imutável.
 */

import type { EvaluationAreaCode } from "@/lib/evaluation-taxonomy";

export type MetricDirection = "HIGHER_BETTER" | "LOWER_BETTER";

export type SignalLevel = "GOOD" | "ATTENTION" | "CRITICAL" | "UNKNOWN";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

/** Pesos das áreas na saúde geral (soma = 1). */
export const AREA_WEIGHTS: Record<EvaluationAreaCode, number> = {
  CX: 0.25,
  UX: 0.3,
  UI: 0.15,
  ACCESSIBILITY: 0.15,
  CONTENT: 0.1,
  DATA: 0.05,
};

/** Dimensões esperadas para cobertura (quais áreas “deveriam” ter evidência). */
export const COVERAGE_AREAS: EvaluationAreaCode[] = [
  "CX",
  "UX",
  "UI",
  "ACCESSIBILITY",
  "CONTENT",
  "DATA",
];

export type MethodBenchmark = {
  /** Valor na escala nativa do método (ex.: NPS -100..100, CES 1–5, SUS 0–100). */
  value: number;
  direction: MetricDirection;
  /** Tolerância abaixo do benchmark antes de ATTENTION (pontos na escala nativa). */
  attentionDelta: number;
  /** Tolerância maior → CRITICAL. */
  criticalDelta: number;
};

/**
 * Benchmarks iniciais por método (configuráveis).
 * Comparação é na escala nativa; normalização 0–100 é separada.
 */
export const METHOD_BENCHMARKS: Record<string, MethodBenchmark> = {
  NPS: { value: 42, direction: "HIGHER_BETTER", attentionDelta: 10, criticalDelta: 25 },
  CES: { value: 4.0, direction: "HIGHER_BETTER", attentionDelta: 0.5, criticalDelta: 1.2 },
  CSAT: { value: 85, direction: "HIGHER_BETTER", attentionDelta: 5, criticalDelta: 15 },
  SUS: { value: 70, direction: "HIGHER_BETTER", attentionDelta: 5, criticalDelta: 15 },
  SATISFACTION: { value: 4.0, direction: "HIGHER_BETTER", attentionDelta: 0.4, criticalDelta: 1 },
  TREE_TESTING: { value: 80, direction: "HIGHER_BETTER", attentionDelta: 10, criticalDelta: 25 },
  FIRST_CLICK: { value: 80, direction: "HIGHER_BETTER", attentionDelta: 10, criticalDelta: 25 },
  CLARITY: { value: 4, direction: "HIGHER_BETTER", attentionDelta: 0.5, criticalDelta: 1 },
  WCAG: {
    // usamos % de conformidade se disponível; senão score derivado de violações
    value: 90,
    direction: "HIGHER_BETTER",
    attentionDelta: 5,
    criticalDelta: 15,
  },
  DESIGN_SYSTEM: {
    value: 90,
    direction: "HIGHER_BETTER",
    attentionDelta: 8,
    criticalDelta: 20,
  },
};

/** Periodicidade sugerida (dias) — null = contínuo / sob demanda. */
export const METHOD_VALIDITY_DAYS: Record<string, number | null> = {
  NPS: 90,
  CSAT: 90,
  CES: 90,
  SATISFACTION: 90,
  SUS: 180,
  USABILITY_TEST: 180,
  HEURISTIC: 180,
  UX_INTERVIEW: 180,
  CX_INTERVIEW: 180,
  CARD_SORTING: 180,
  TREE_TESTING: 180,
  FIRST_CLICK: 180,
  FLOW_EVAL: 180,
  JOURNEY_RESEARCH: 180,
  VISUAL_REVIEW: 180,
  DESIGN_SYSTEM: 180,
  RESPONSIVE: 180,
  WCAG: 365,
  KEYBOARD: 365,
  SCREEN_READER: 365,
  CONTRAST: 365,
  UX_WRITING: 180,
  CLARITY: 180,
  TONE: 180,
  COMPREHENSION: 180,
  ANALYTICS: null,
  MS_CLARITY: null,
  HOTJAR: null,
  FUNNEL: 90,
  BEHAVIORAL: null,
  CUSTOM: 180,
};

/** Pesos de severidade para índice de problemas qualitativos. */
export const SEVERITY_WEIGHTS = {
  critical: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.2,
} as const;

/** Limiares da saúde 0–100. */
export function healthSignal(score: number | null): SignalLevel {
  if (score == null) return "UNKNOWN";
  if (score >= 80) return "GOOD";
  if (score >= 60) return "ATTENTION";
  return "CRITICAL";
}

export const SIGNAL_LABEL: Record<SignalLevel, string> = {
  GOOD: "Bom",
  ATTENTION: "Atenção",
  CRITICAL: "Crítico",
  UNKNOWN: "Sem evidência",
};

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
  NONE: "Sem base",
};
