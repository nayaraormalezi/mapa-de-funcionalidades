/**
 * Health canônico do PRISMA.
 *
 * Fonte única:
 *   FeatureChannelEvaluation[] → buildChannelIntelligence → healthScore | null
 *
 * Agregação Feature:
 *   média aritmética dos healthScore dos canais COM evidência
 *   canais sem Evaluation NÃO entram como 0
 *
 * ExperienceLevel (campo em FeatureChannelContext) é DEPRECATED como fonte de Health.
 */

import {
  buildChannelIntelligence,
  type ChannelIntelligence,
} from "@/lib/evaluation-intelligence";
import {
  healthSignal,
  SIGNAL_LABEL,
  type SignalLevel,
} from "@/lib/evaluation-governance";
import type { FeatureChannelEvaluation } from "@/types";

export type { SignalLevel };
export { healthSignal, SIGNAL_LABEL, buildChannelIntelligence };

export type FeatureHealth = {
  /** null = UNKNOWN / sem evidência suficiente (≠ score 0). */
  score: number | null;
  signal: SignalLevel;
  scoredCount: number;
  totalChannels: number;
};

/**
 * Agrega Health de canais → Feature.
 * Fórmula existente (Feature Sheet): média dos scores não-nulos.
 * Canal sem Evaluation (null) é ignorado — nunca trata como 0.
 */
export function aggregateFeatureHealth(
  channelScores: ReadonlyArray<number | null>,
): FeatureHealth {
  const scored = channelScores.filter((s): s is number => s != null);
  const totalChannels = channelScores.length;
  if (scored.length === 0) {
    return {
      score: null,
      signal: "UNKNOWN",
      scoredCount: 0,
      totalChannels,
    };
  }
  const avg = Math.round(
    scored.reduce((sum, s) => sum + s, 0) / scored.length,
  );
  return {
    score: avg,
    signal: healthSignal(avg),
    scoredCount: scored.length,
    totalChannels,
  };
}

/** Health de um canal a partir das evaluations daquele canal. */
export function channelHealthFromEvaluations(
  evaluations: FeatureChannelEvaluation[],
): ChannelIntelligence {
  return buildChannelIntelligence(evaluations);
}

/**
 * Nível de distribuição para KPIs (Intelligence / Relatórios).
 * NOT_EVALUATED = sem score (UNKNOWN) — nunca confundir com CRITICAL.
 */
export type HealthBucket = "GOOD" | "ATTENTION" | "CRITICAL" | "NOT_EVALUATED";

export function healthToBucket(
  score: number | null,
  signal?: SignalLevel,
): HealthBucket {
  const s = signal ?? healthSignal(score);
  if (score == null || s === "UNKNOWN") return "NOT_EVALUATED";
  if (s === "GOOD") return "GOOD";
  if (s === "ATTENTION") return "ATTENTION";
  return "CRITICAL";
}

export const HEALTH_BUCKET_LABEL: Record<HealthBucket, string> = {
  GOOD: SIGNAL_LABEL.GOOD,
  ATTENTION: SIGNAL_LABEL.ATTENTION,
  CRITICAL: SIGNAL_LABEL.CRITICAL,
  NOT_EVALUATED: "Não avaliada",
};

/** Agrupa evaluations por featureId::channelContextId. */
export function groupEvaluationsByChannel(
  evaluations: FeatureChannelEvaluation[],
): Map<string, FeatureChannelEvaluation[]> {
  const map = new Map<string, FeatureChannelEvaluation[]>();
  for (const ev of evaluations) {
    if (ev.active === false) continue;
    const key = `${ev.featureId}::${ev.channelContextId}`;
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  return map;
}

export function evaluationChannelKey(
  featureId: string,
  channelContextId: string,
): string {
  return `${featureId}::${channelContextId}`;
}
