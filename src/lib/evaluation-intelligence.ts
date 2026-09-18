/**
 * Camadas: Pesquisas → Resultados normalizados → Inteligência → Saúde da funcionalidade.
 *
 * Duas notas obrigatórias:
 * - Saúde da experiência (só com evidências existentes)
 * - Cobertura de evidências (% de dimensões avaliadas)
 *
 * Ausência de pesquisa ≠ nota ruim.
 */

import {
  AREA_WEIGHTS,
  COVERAGE_AREAS,
  CONFIDENCE_LABEL,
  METHOD_BENCHMARKS,
  METHOD_VALIDITY_DAYS,
  SEVERITY_WEIGHTS,
  SIGNAL_LABEL,
  healthSignal,
  type ConfidenceLevel,
  type SignalLevel,
} from "@/lib/evaluation-governance";
import {
  EVALUATION_AREAS,
  evaluationAreaLabel,
  evaluationMethodLabel,
  type EvaluationAreaCode,
} from "@/lib/evaluation-taxonomy";
import type { FeatureChannelEvaluation } from "@/types";

export type NormalizedMethodScore = {
  evaluationId: string;
  area: EvaluationAreaCode;
  methodCode: string;
  methodLabel: string;
  /** Score 0–100 ou null se não normalizável. */
  score: number | null;
  nativeValue: number | null;
  nativeLabel: string;
  signal: SignalLevel;
  signalReason: string;
  sampleSize: number;
  evaluatedAt: string | null;
  stale: boolean;
  staleDays: number | null;
  validityDays: number | null;
  trend: TrendInfo | null;
};

export type TrendInfo = {
  direction: "UP" | "DOWN" | "FLAT";
  delta: number;
  points: { date: string; value: number }[];
  message: string;
};

export type AreaIntelligence = {
  area: EvaluationAreaCode;
  label: string;
  /** null = área sem evidências (não puxa a saúde para baixo). */
  score: number | null;
  signal: SignalLevel;
  weight: number;
  covered: boolean;
  methods: NormalizedMethodScore[];
  reasons: string[];
};

export type Opportunity = {
  id: string;
  severity: SignalLevel;
  title: string;
  summary: string;
  evidence: string[];
  /** IDs das avaliações que originaram a oportunidade (auditabilidade). */
  evaluationIds: string[];
  areas: EvaluationAreaCode[];
  suggestion: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  confidence: ConfidenceLevel;
  origin: string;
};

export type AttentionSignal = {
  id: string;
  type:
    | "BELOW_BENCHMARK"
    | "TREND_DOWN"
    | "CRITICAL_RESULT"
    | "SEVERITY_LOAD"
    | "STALE"
    | "LOW_COVERAGE"
    | "LOW_CONFIDENCE"
    | "BEHAVIORAL";
  severity: SignalLevel;
  title: string;
  evidence: string;
  date: string | null;
  evaluationId: string | null;
  area: EvaluationAreaCode | null;
};

export type CrossInsight = {
  id: string;
  severity: SignalLevel;
  /** Linguagem cautelosa: sugere / indica / hipótese. */
  hypothesis: string;
  evidence: string[];
  evaluationIds: string[];
  areas: EvaluationAreaCode[];
};

export type ScoreMethodologyLine = {
  area: EvaluationAreaCode;
  label: string;
  score: number;
  configuredWeight: number;
  /** Peso efetivo após redistribuir áreas sem evidência. */
  effectiveWeight: number;
  contribution: number;
  methods: { label: string; score: number; evaluationId: string }[];
};

export type ScoreMethodology = {
  healthScore: number | null;
  lines: ScoreMethodologyLine[];
  uncoveredAreas: { area: EvaluationAreaCode; label: string }[];
  explanation: string[];
};

export type ChannelIntelligence = {
  healthScore: number | null;
  healthSignal: SignalLevel;
  coveragePercent: number;
  coveredCount: number;
  expectedCount: number;
  confidence: ConfidenceLevel;
  confidenceLabel: string;
  evidenceCount: number;
  staleCount: number;
  opportunities: Opportunity[];
  areas: AreaIntelligence[];
  methods: NormalizedMethodScore[];
  signals: AttentionSignal[];
  crossInsights: CrossInsight[];
  methodology: ScoreMethodology;
  limitedEvidenceWarning: boolean;
  narrative: string[];
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function daysBetween(from: string, to = new Date()): number {
  const a = new Date(from.slice(0, 10) + "T12:00:00");
  const b = new Date(to.toISOString().slice(0, 10) + "T12:00:00");
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/** NPS -100..+100 → 0..100 */
export function normalizeNps(nps: number): number {
  return clamp((nps + 100) / 2);
}

/** Escala linear min..max → 0..100 */
export function normalizeLinear(
  value: number,
  min: number,
  max: number,
  direction: "HIGHER_BETTER" | "LOWER_BETTER" = "HIGHER_BETTER",
): number {
  if (max === min) return 50;
  const t = (value - min) / (max - min);
  const score = direction === "HIGHER_BETTER" ? t * 100 : (1 - t) * 100;
  return clamp(score);
}

function benchmarkSignal(
  methodCode: string,
  nativeValue: number,
  results?: Record<string, unknown>,
): { signal: SignalLevel; reason: string; benchmark: number | null } {
  const override = num(results?.benchmark_value);
  const bm = METHOD_BENCHMARKS[methodCode];
  const benchmarkValue = override ?? bm?.value ?? null;
  const direction = bm?.direction ?? "HIGHER_BETTER";
  const attentionDelta = bm?.attentionDelta ?? 5;
  const criticalDelta = bm?.criticalDelta ?? 15;
  const scope = String(results?.benchmark_scope ?? "interno");

  if (benchmarkValue == null) {
    return {
      signal: "UNKNOWN",
      reason: "Sem benchmark configurado.",
      benchmark: null,
    };
  }
  const diff =
    direction === "HIGHER_BETTER"
      ? nativeValue - benchmarkValue
      : benchmarkValue - nativeValue;

  if (diff >= 0) {
    return {
      signal: "GOOD",
      reason: `Acima ou no benchmark ${scope} (${benchmarkValue}).`,
      benchmark: benchmarkValue,
    };
  }
  const gap = Math.abs(diff);
  if (gap >= criticalDelta) {
    return {
      signal: "CRITICAL",
      reason: `${gap.toFixed(1)} pts abaixo do benchmark ${scope} (${benchmarkValue}).`,
      benchmark: benchmarkValue,
    };
  }
  if (gap >= attentionDelta) {
    return {
      signal: "ATTENTION",
      reason: `${gap.toFixed(1)} pts abaixo do benchmark ${scope} (${benchmarkValue}).`,
      benchmark: benchmarkValue,
    };
  }
  return {
    signal: "GOOD",
    reason: `Próximo do benchmark ${scope} (${benchmarkValue}).`,
    benchmark: benchmarkValue,
  };
}

/**
 * Índice de problemas UX a partir de contagens / findings_list.
 * Score alto = poucos problemas. Sempre explicável.
 */
export function qualitativeProblemIndex(results: Record<string, unknown>): {
  score: number;
  signal: SignalLevel;
  reason: string;
  factors: string[];
} {
  const list = Array.isArray(results.findings_list)
    ? (results.findings_list as {
        severity?: string;
        affectedCount?: number;
        participantTotal?: number;
        description?: string;
      }[])
    : [];

  let critical = num(results.critical) ?? num(results.findings_critical) ?? 0;
  let high = num(results.high) ?? num(results.findings_high) ?? 0;
  let medium = num(results.medium) ?? num(results.findings_medium) ?? 0;
  let low = num(results.low) ?? num(results.findings_low) ?? 0;

  if (list.length > 0) {
    critical = list.filter((f) => f.severity === "CRITICAL").length;
    high = list.filter((f) => f.severity === "HIGH").length;
    medium = list.filter((f) => f.severity === "MEDIUM").length;
    low = list.filter((f) => f.severity === "LOW").length;
  }

  const hasSplit =
    list.length > 0 ||
    results.critical != null ||
    results.high != null ||
    results.medium != null ||
    results.low != null ||
    results.findings_critical != null;

  if (!hasSplit) {
    medium = num(results.findings_count) ?? medium;
  }

  const participants = num(results.participants) ?? 1;

  let frequencyBoost = 0;
  for (const f of list) {
    if (f.affectedCount != null && f.participantTotal) {
      const ratio = f.affectedCount / Math.max(f.participantTotal, 1);
      if (ratio >= 0.5) frequencyBoost += 0.3;
      if (ratio >= 0.8) frequencyBoost += 0.3;
    }
  }

  const weighted =
    critical * SEVERITY_WEIGHTS.critical +
    high * SEVERITY_WEIGHTS.high +
    medium * SEVERITY_WEIGHTS.medium +
    low * SEVERITY_WEIGHTS.low +
    frequencyBoost;

  const density = weighted / Math.max(participants, 1);
  const score = clamp(100 - density * 50);

  let signal: SignalLevel = "GOOD";
  if (critical >= 2 || score < 50) signal = "CRITICAL";
  else if (critical >= 1 || high >= 3 || score < 70) signal = "ATTENTION";

  const factors = [
    critical ? `${critical} problema(s) crítico(s)` : null,
    high ? `${high} problema(s) alto(s)` : null,
    medium ? `${medium} problema(s) médio(s)` : null,
    low ? `${low} problema(s) baixo(s)` : null,
    list.some((f) => (f.affectedCount ?? 0) >= 5)
      ? "alta frequência em pelo menos um achado"
      : null,
  ].filter(Boolean) as string[];

  return {
    score: Math.round(score),
    signal,
    reason: factors.length
      ? `Base: ${factors.join("; ")}.`
      : "Sem achados estruturados registrados.",
    factors,
  };
}

function sampleSizeFromResults(
  methodCode: string,
  results: Record<string, unknown>,
): number {
  return (
    num(results.responses) ??
    num(results.participants) ??
    num(results.sessions) ??
    0
  );
}

export function normalizeEvaluation(
  evaluation: FeatureChannelEvaluation,
  history: FeatureChannelEvaluation[] = [],
): NormalizedMethodScore {
  const results = evaluation.results ?? {};
  const methodCode = evaluation.methodCode;
  const methodLabel = evaluationMethodLabel(
    evaluation.area,
    methodCode,
    evaluation.methodCustomName,
  );
  const sampleSize = sampleSizeFromResults(methodCode, results);
  const validityDays = METHOD_VALIDITY_DAYS[methodCode] ?? 180;
  const evaluatedAt = evaluation.evaluatedAt;
  let stale = evaluation.status === "NEEDS_UPDATE";
  let staleDays: number | null = null;
  if (evaluatedAt && validityDays != null) {
    staleDays = daysBetween(evaluatedAt);
    if (staleDays > validityDays) stale = true;
  }

  let score: number | null = null;
  let nativeValue: number | null = null;
  let nativeLabel = "—";
  let signal: SignalLevel = "UNKNOWN";
  let signalReason = "";

  if (methodCode === "NPS") {
    nativeValue = num(results.score);
    if (nativeValue != null) {
      score = Math.round(normalizeNps(nativeValue));
      nativeLabel = `${nativeValue > 0 ? "+" : ""}${nativeValue}`;
      const bm = benchmarkSignal("NPS", nativeValue, results);
      signal = bm.signal;
      signalReason = bm.reason;
    }
  } else if (methodCode === "CES") {
    nativeValue = num(results.score);
    const scale = num(results.scale) ?? 5;
    if (nativeValue != null) {
      score = Math.round(normalizeLinear(nativeValue, 1, scale));
      nativeLabel = `${nativeValue}/${scale}`;
      const bm = benchmarkSignal("CES", nativeValue, results);
      signal = bm.signal;
      signalReason = bm.reason;
    }
  } else if (methodCode === "CSAT" || methodCode === "TREE_TESTING" || methodCode === "FIRST_CLICK") {
    nativeValue = num(results.score) ?? num(results.success_rate);
    if (nativeValue != null) {
      score = Math.round(clamp(nativeValue));
      nativeLabel = `${nativeValue}%`;
      const bmKey = methodCode === "CSAT" ? "CSAT" : methodCode;
      const bm = benchmarkSignal(bmKey, nativeValue, results);
      signal = bm.signal;
      signalReason = bm.reason;
    }
  } else if (methodCode === "SUS") {
    nativeValue = num(results.score);
    if (nativeValue != null) {
      score = Math.round(clamp(nativeValue));
      nativeLabel = String(nativeValue);
      const bm = benchmarkSignal("SUS", nativeValue, results);
      signal = bm.signal;
      signalReason = bm.reason;
    }
  } else if (
    methodCode === "USABILITY_TEST" ||
    methodCode === "HEURISTIC" ||
    methodCode === "FLOW_EVAL" ||
    methodCode === "JOURNEY_RESEARCH"
  ) {
    const q = qualitativeProblemIndex(results);
    score = q.score;
    signal = q.signal;
    signalReason = q.reason;
    const crit = num(results.critical) ?? 0;
    const findings = num(results.findings_count) ?? num(results.opportunities);
    nativeValue = findings;
    nativeLabel = findings != null ? `${findings} achados` : q.reason;
    if (crit > 0) nativeLabel = `${crit} críticos · ${nativeLabel}`;
  } else if (methodCode === "DESIGN_SYSTEM" || methodCode === "WCAG") {
    // Preferência: % aderência/conformidade; senão deriva de inconsistências/violações
    const pct = num(results.score) ?? num(results.compliance) ?? num(results.adherence);
    if (pct != null) {
      nativeValue = pct;
      score = Math.round(clamp(pct));
      nativeLabel = `${pct}%`;
      const bm = benchmarkSignal(methodCode, pct, results);
      signal = bm.signal;
      signalReason = bm.reason;
    } else {
      const issues =
        num(results.inconsistencies) ??
        num(results.violations) ??
        num(results.opportunities) ??
        0;
      score = Math.round(clamp(100 - issues * 8));
      nativeValue = issues;
      nativeLabel = `${issues} inconsistências`;
      signal = score >= 80 ? "GOOD" : score >= 60 ? "ATTENTION" : "CRITICAL";
      signalReason =
        issues === 0
          ? "Sem inconsistências registradas."
          : `${issues} inconsistência(s) identificada(s).`;
    }
  } else if (methodCode === "CUSTOM" || methodCode === "OTHER") {
    const summary = num(results.score) ?? num(results.result_summary);
    if (summary != null && summary <= 100) {
      score = Math.round(clamp(summary));
      nativeValue = summary;
      nativeLabel = String(summary);
      signal = healthSignal(score);
      signalReason = "Score informado na avaliação personalizada.";
    }
  } else {
    // Genérico: score numérico se existir
    const s = num(results.score) ?? num(results.success_rate);
    if (s != null) {
      nativeValue = s;
      score = Math.round(s <= 10 ? normalizeLinear(s, 1, 5) : clamp(s));
      nativeLabel = String(s);
      signal = healthSignal(score);
      signalReason = "Normalizado a partir do resultado informado.";
    }
  }

  if (stale && signal === "GOOD") {
    signal = "ATTENTION";
    signalReason = (signalReason ? signalReason + " " : "") + "Evidência desatualizada.";
  }

  const trend = detectTrend(evaluation, history);

  return {
    evaluationId: evaluation.id,
    area: evaluation.area as EvaluationAreaCode,
    methodCode,
    methodLabel,
    score,
    nativeValue,
    nativeLabel,
    signal,
    signalReason,
    sampleSize,
    evaluatedAt,
    stale,
    staleDays,
    validityDays,
    trend,
  };
}

function detectTrend(
  current: FeatureChannelEvaluation,
  all: FeatureChannelEvaluation[],
): TrendInfo | null {
  const series = all
    .filter(
      (e) =>
        e.area === current.area &&
        e.methodCode === current.methodCode &&
        e.evaluatedAt &&
        (e.status === "COMPLETED" ||
          e.status === "NEEDS_UPDATE" ||
          e.id === current.id),
    )
    .map((e) => {
      const n = normalizeEvaluationLite(e);
      return n.nativeValue != null && e.evaluatedAt
        ? { date: e.evaluatedAt, value: n.nativeValue }
        : null;
    })
    .filter((p): p is { date: string; value: number } => Boolean(p))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (series.length < 3) return null;

  const recent = series.slice(-4);
  const first = recent[0].value;
  const last = recent[recent.length - 1].value;
  const delta = last - first;
  const direction =
    delta <= -5 ? "DOWN" : delta >= 5 ? "UP" : ("FLAT" as const);

  if (direction === "FLAT") return null;

  const methodLabel = evaluationMethodLabel(
    current.area,
    current.methodCode,
    current.methodCustomName,
  );

  return {
    direction,
    delta,
    points: recent,
    message:
      direction === "DOWN"
        ? `${methodLabel} caiu ${Math.abs(Math.round(delta))} pts nas últimas ${recent.length} medições.`
        : `${methodLabel} subiu ${Math.abs(Math.round(delta))} pts nas últimas ${recent.length} medições.`,
  };
}

/** Normalização leve só para tendência (evita recursão com history). */
function normalizeEvaluationLite(evaluation: FeatureChannelEvaluation): {
  nativeValue: number | null;
} {
  const results = evaluation.results ?? {};
  const methodCode = evaluation.methodCode;
  if (methodCode === "NPS" || methodCode === "CES" || methodCode === "SUS" || methodCode === "CSAT") {
    return { nativeValue: num(results.score) };
  }
  if (methodCode === "TREE_TESTING" || methodCode === "FIRST_CLICK") {
    return { nativeValue: num(results.success_rate) ?? num(results.score) };
  }
  return { nativeValue: num(results.score) };
}

function computeConfidence(methods: NormalizedMethodScore[]): ConfidenceLevel {
  const withSample = methods.filter((m) => m.sampleSize > 0 || m.score != null);
  if (withSample.length === 0) return "NONE";
  const totalSample = withSample.reduce((s, m) => s + m.sampleSize, 0);
  const methodCount = withSample.length;
  if (totalSample >= 200 || (methodCount >= 4 && totalSample >= 40)) return "HIGH";
  if (totalSample >= 30 || methodCount >= 3) return "MEDIUM";
  return "LOW";
}

function buildOpportunities(
  areas: AreaIntelligence[],
  methods: NormalizedMethodScore[],
  crossInsights: CrossInsight[],
): Opportunity[] {
  const ops: Opportunity[] = [];
  void areas;

  /**
   * Regra principal: nota baixa (ATTENTION / CRITICAL) → oportunidade de melhoria.
   * Evidência desatualizada permanece em "Atualizações necessárias", não aqui.
   */
  for (const m of methods) {
    if (m.signal !== "ATTENTION" && m.signal !== "CRITICAL") continue;
    // Stale-only bump sem nota: se score null, não criar oportunidade de "nota baixa"
    if (m.score == null && m.nativeValue == null) continue;

    const scoreLabel =
      m.nativeLabel && m.nativeLabel !== "—"
        ? m.nativeLabel
        : m.score != null
          ? `${m.score}/100`
          : null;

    ops.push({
      id: `opp-score-${m.evaluationId}`,
      severity: m.signal,
      title:
        m.signal === "CRITICAL"
          ? `Melhorar ${m.methodLabel} (resultado crítico)`
          : `Oportunidade de melhoria · ${m.methodLabel}`,
      summary: [
        scoreLabel ? `Resultado: ${scoreLabel}.` : null,
        m.signalReason,
      ]
        .filter(Boolean)
        .join(" "),
      evidence: [
        scoreLabel ? `${m.methodLabel}: ${scoreLabel}` : m.methodLabel,
        m.signalReason,
      ].filter(Boolean),
      evaluationIds: [m.evaluationId],
      areas: [m.area],
      suggestion: `Investigar hipóteses de melhoria a partir do resultado de ${m.methodLabel} e validar com evidências adicionais antes de afirmar causa.`,
      impact: m.signal === "CRITICAL" ? "HIGH" : "MEDIUM",
      confidence: m.sampleSize >= 30 ? "HIGH" : m.sampleSize >= 5 ? "MEDIUM" : "LOW",
      origin: "Nota de avaliação abaixo do esperado",
    });
  }

  // Cruzamentos reforçam oportunidades quando várias notas baixas convergem
  for (const insight of crossInsights) {
    ops.push({
      id: `opp-${insight.id}`,
      severity: insight.severity,
      title:
        insight.severity === "CRITICAL"
          ? "Fricção estrutural indicada pelas evidências"
          : "Evidências convergentes de oportunidade",
      summary: insight.hypothesis,
      evidence: insight.evidence,
      evaluationIds: insight.evaluationIds,
      areas: insight.areas,
      suggestion:
        "Revisar a etapa onde as evidências convergem — há indícios de oportunidade, sem assumir causa única até validar.",
      impact: insight.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
      confidence: insight.evidence.length >= 3 ? "HIGH" : "MEDIUM",
      origin: "Cruzamento de avaliações com nota baixa",
    });
  }

  // Tendência de queda: a nota está piorando ao longo do tempo
  for (const m of methods) {
    if (m.trend?.direction !== "DOWN") continue;
    ops.push({
      id: `trend-${m.evaluationId}`,
      severity: "ATTENTION",
      title: `Tendência de queda · ${m.methodLabel}`,
      summary: m.trend.message,
      evidence: m.trend.points.map(
        (p) => `${p.date.slice(0, 10)}: ${p.value}`,
      ),
      evaluationIds: [m.evaluationId],
      areas: [m.area],
      suggestion:
        "Investigar hipóteses de causa no período da queda e cruzar com outras métricas — a tendência sugere deterioração.",
      impact: "HIGH",
      confidence: "MEDIUM",
      origin: "Histórico de avaliações",
    });
  }

  const seen = new Set<string>();
  return ops
    .filter((o) => {
      if (seen.has(o.title)) return false;
      seen.add(o.title);
      return true;
    })
    .slice(0, 8);
}

function buildCrossInsights(
  methods: NormalizedMethodScore[],
  evaluations: FeatureChannelEvaluation[],
): CrossInsight[] {
  const insights: CrossInsight[] = [];
  const byCode = (code: string) => methods.find((m) => m.methodCode === code);

  const nps = byCode("NPS");
  const ces = byCode("CES");
  const usability = byCode("USABILITY_TEST");
  const clarity = byCode("MS_CLARITY") ?? byCode("BEHAVIORAL");

  const cxFriction =
    nps &&
    ces &&
    (nps.signal === "ATTENTION" || nps.signal === "CRITICAL") &&
    (ces.signal === "ATTENTION" || ces.signal === "CRITICAL");

  if (cxFriction && usability && (usability.signal === "ATTENTION" || usability.signal === "CRITICAL")) {
    insights.push({
      id: "cross-cx-ux-friction",
      severity:
        nps.signal === "CRITICAL" || ces.signal === "CRITICAL"
          ? "CRITICAL"
          : "ATTENTION",
      hypothesis:
        "Há evidências convergentes de fricção na jornada (CX e UX abaixo do esperado). Isso sugere — sem afirmar causalidade — uma oportunidade estrutural na etapa principal.",
      evidence: [
        `NPS ${nps.nativeLabel}: ${nps.signalReason}`,
        `CES ${ces.nativeLabel}: ${ces.signalReason}`,
        `Usabilidade: ${usability.signalReason}`,
      ],
      evaluationIds: [nps.evaluationId, ces.evaluationId, usability.evaluationId],
      areas: ["CX", "UX"],
    });
  } else if (cxFriction) {
    insights.push({
      id: "cross-cx-metrics",
      severity: "ATTENTION",
      hypothesis:
        "NPS e CES abaixo do benchmark indicam esforço/recomendação sob pressão. Hipótese de oportunidade: revisar pontos de atrito do fluxo.",
      evidence: [
        `NPS ${nps!.nativeLabel}: ${nps!.signalReason}`,
        `CES ${ces!.nativeLabel}: ${ces!.signalReason}`,
      ],
      evaluationIds: [nps!.evaluationId, ces!.evaluationId],
      areas: ["CX"],
    });
  }

  // Behavioral + qualitative same stage (from results)
  const clarityEval = evaluations.find(
    (e) => e.methodCode === "MS_CLARITY" || e.methodCode === "BEHAVIORAL",
  );
  const usabilityEval = evaluations.find((e) => e.methodCode === "USABILITY_TEST");
  if (clarityEval && usabilityEval) {
    const qb = num(clarityEval.results?.quick_backs);
    const drop = num(clarityEval.results?.dropoff_rate);
    const stage =
      String(clarityEval.results?.friction_stage ?? "") ||
      String(usabilityEval.results?.friction_stage ?? "");
    if ((qb != null && qb > 0) || (drop != null && drop >= 20)) {
      insights.push({
        id: "cross-behavioral-qual",
        severity: "ATTENTION",
        hypothesis: stage
          ? `Os dados comportamentais e qualitativos apontam para a mesma etapa (“${stage}”). Isso indica convergência de sinais — hipótese a validar, não causalidade comprovada.`
          : "Dados comportamentais e qualitativos sugerem fricção no mesmo fluxo. Há evidências convergentes a investigar.",
        evidence: [
          qb != null ? `Quick backs: ${qb}` : null,
          drop != null ? `Abandono: ${drop}%` : null,
          usabilityEval.findings || "Achados de usabilidade registrados",
        ].filter(Boolean) as string[],
        evaluationIds: [clarityEval.id, usabilityEval.id],
        areas: ["DATA", "UX"],
      });
    }
  }

  void clarity;
  return insights;
}

function buildSignals(
  methods: NormalizedMethodScore[],
  coveragePercent: number,
  confidence: ConfidenceLevel,
  evaluations: FeatureChannelEvaluation[],
): AttentionSignal[] {
  const signals: AttentionSignal[] = [];

  for (const m of methods) {
    if (m.signal === "ATTENTION" || m.signal === "CRITICAL") {
      if (m.signalReason.includes("benchmark")) {
        signals.push({
          id: `bm-${m.evaluationId}`,
          type: "BELOW_BENCHMARK",
          severity: m.signal,
          title: `${m.methodLabel} abaixo do benchmark`,
          evidence: `${m.nativeLabel} — ${m.signalReason}`,
          date: m.evaluatedAt,
          evaluationId: m.evaluationId,
          area: m.area,
        });
      } else if (m.methodCode === "USABILITY_TEST" || m.methodCode === "HEURISTIC") {
        signals.push({
          id: `sev-${m.evaluationId}`,
          type: "SEVERITY_LOAD",
          severity: m.signal,
          title: `Carga de problemas · ${m.methodLabel}`,
          evidence: m.signalReason,
          date: m.evaluatedAt,
          evaluationId: m.evaluationId,
          area: m.area,
        });
      } else {
        signals.push({
          id: `crit-${m.evaluationId}`,
          type: "CRITICAL_RESULT",
          severity: m.signal,
          title: `Resultado em atenção · ${m.methodLabel}`,
          evidence: m.signalReason || m.nativeLabel,
          date: m.evaluatedAt,
          evaluationId: m.evaluationId,
          area: m.area,
        });
      }
    }
    if (m.trend?.direction === "DOWN") {
      signals.push({
        id: `tr-${m.evaluationId}`,
        type: "TREND_DOWN",
        severity: "ATTENTION",
        title: `Tendência de queda · ${m.methodLabel}`,
        evidence: m.trend.message,
        date: m.evaluatedAt,
        evaluationId: m.evaluationId,
        area: m.area,
      });
    }
    if (m.stale) {
      signals.push({
        id: `st-${m.evaluationId}`,
        type: "STALE",
        severity: "ATTENTION",
        title: `${m.methodLabel} desatualizado`,
        evidence:
          m.staleDays != null && m.validityDays != null
            ? `Última coleta há ${m.staleDays} dias (periodicidade ${m.validityDays} dias).`
            : "Marcado como atualização necessária.",
        date: m.evaluatedAt,
        evaluationId: m.evaluationId,
        area: m.area,
      });
    }
  }

  if (coveragePercent < 50) {
    signals.push({
      id: "low-coverage",
      type: "LOW_COVERAGE",
      severity: "ATTENTION",
      title: "Baixa cobertura de evidências",
      evidence: `Apenas ${coveragePercent}% das dimensões esperadas possuem avaliação.`,
      date: null,
      evaluationId: null,
      area: null,
    });
  }

  if (confidence === "LOW" || confidence === "NONE") {
    signals.push({
      id: "low-confidence",
      type: "LOW_CONFIDENCE",
      severity: "ATTENTION",
      title: "Baixa confiança amostral",
      evidence:
        "Poucas respostas/participantes nas evidências atuais — a nota deve ser interpretada com cautela.",
      date: null,
      evaluationId: null,
      area: null,
    });
  }

  for (const e of evaluations) {
    const qb = num(e.results?.quick_backs);
    if (qb != null && qb >= 10) {
      signals.push({
        id: `qb-${e.id}`,
        type: "BEHAVIORAL",
        severity: "ATTENTION",
        title: "Quick backs elevados",
        evidence: `${qb} quick backs registrados${e.results?.friction_stage ? ` na etapa “${e.results.friction_stage}”` : ""}.`,
        date: e.evaluatedAt,
        evaluationId: e.id,
        area: e.area as EvaluationAreaCode,
      });
    }
  }

  return signals.slice(0, 12);
}

/**
 * Usa apenas a avaliação mais recente por área+método para a saúde
 * (histórico alimenta tendência, não a média).
 */
function latestPerMethod(
  evaluations: FeatureChannelEvaluation[],
): FeatureChannelEvaluation[] {
  const map = new Map<string, FeatureChannelEvaluation>();
  const sorted = [...evaluations].sort((a, b) => {
    const da = a.evaluatedAt ?? a.createdAt;
    const db = b.evaluatedAt ?? b.createdAt;
    return db.localeCompare(da);
  });
  for (const e of sorted) {
    if (e.status === "PLANNED" || e.status === "NOT_EVALUATED") continue;
    const key = `${e.area}::${e.methodCode}`;
    if (!map.has(key)) map.set(key, e);
  }
  return Array.from(map.values());
}

export function buildChannelIntelligence(
  evaluations: FeatureChannelEvaluation[],
): ChannelIntelligence {
  const active = evaluations.filter((e) => e.active !== false);
  const latest = latestPerMethod(active);

  const methods = latest.map((e) => normalizeEvaluation(e, active));

  const areas: AreaIntelligence[] = EVALUATION_AREAS.map((areaDef) => {
    const areaMethods = methods.filter((m) => m.area === areaDef.code);
    const scored = areaMethods.filter((m) => m.score != null);
    const covered = scored.length > 0;
    const score =
      scored.length === 0
        ? null
        : Math.round(
            scored.reduce((s, m) => s + (m.score ?? 0), 0) / scored.length,
          );
    const signal = healthSignal(score);
    const reasons = areaMethods
      .filter((m) => m.signal === "ATTENTION" || m.signal === "CRITICAL" || m.stale)
      .map((m) => `${m.methodLabel}: ${m.signalReason || m.nativeLabel}`)
      .slice(0, 4);

    if (score != null && reasons.length === 0 && signal === "GOOD") {
      reasons.push("Resultados dentro ou acima do esperado.");
    }

    return {
      area: areaDef.code,
      label: areaDef.shortLabel,
      score,
      signal: covered ? signal : "UNKNOWN",
      weight: AREA_WEIGHTS[areaDef.code],
      covered,
      methods: areaMethods,
      reasons,
    };
  });

  const coveredAreas = areas.filter(
    (a) => a.covered && COVERAGE_AREAS.includes(a.area),
  );
  const expectedCount = COVERAGE_AREAS.length;
  const coveredCount = coveredAreas.length;
  const coveragePercent = Math.round((coveredCount / expectedCount) * 100);

  const weighted = coveredAreas.filter((a) => a.score != null);
  let healthScore: number | null = null;
  const methodologyLines: ScoreMethodologyLine[] = [];

  if (weighted.length > 0) {
    const weightSum = weighted.reduce((s, a) => s + a.weight, 0);
    healthScore = Math.round(
      weighted.reduce((s, a) => s + (a.score ?? 0) * (a.weight / weightSum), 0),
    );
    for (const a of weighted) {
      const effectiveWeight = a.weight / weightSum;
      methodologyLines.push({
        area: a.area,
        label: a.label,
        score: a.score!,
        configuredWeight: a.weight,
        effectiveWeight,
        contribution: Math.round(a.score! * effectiveWeight * 10) / 10,
        methods: a.methods
          .filter((m) => m.score != null)
          .map((m) => ({
            label: m.methodLabel,
            score: m.score!,
            evaluationId: m.evaluationId,
          })),
      });
    }
  }

  const uncoveredAreas = areas
    .filter((a) => !a.covered && COVERAGE_AREAS.includes(a.area))
    .map((a) => ({ area: a.area, label: a.label }));

  const methodology: ScoreMethodology = {
    healthScore,
    lines: methodologyLines,
    uncoveredAreas,
    explanation: [
      "A saúde usa apenas áreas com evidência (ausência não vira zero).",
      "Pesos configuráveis são redistribuídos proporcionalmente entre áreas elegíveis.",
      "Cada método é normalizado para 0–100 antes da agregação da área.",
    ],
  };

  const confidence = computeConfidence(methods);
  const crossInsights = buildCrossInsights(methods, active);
  const opportunities = buildOpportunities(areas, methods, crossInsights);
  const signals = buildSignals(methods, coveragePercent, confidence, active);
  const staleCount = methods.filter((m) => m.stale).length;
  const limitedEvidenceWarning =
    confidence === "LOW" || confidence === "NONE" || coveragePercent < 40;

  const narrative: string[] = [];
  if (healthScore == null) {
    narrative.push(
      "Ainda não há evidências suficientes para calcular a saúde da experiência.",
    );
  } else if (limitedEvidenceWarning) {
    narrative.push(
      "Nota baseada em evidências limitadas — interprete com cautela (confiança baixa não significa experiência ruim).",
    );
  } else {
    narrative.push(
      `${coveredCount} de ${expectedCount} dimensões com evidência · confiança ${CONFIDENCE_LABEL[confidence].toLowerCase()}.`,
    );
  }
  if (opportunities.length > 0) {
    narrative.push(
      `${opportunities.length} oportunidade(s) de evolução identificada(s) a partir das evidências.`,
    );
  }

  return {
    healthScore,
    healthSignal: healthSignal(healthScore),
    coveragePercent,
    coveredCount,
    expectedCount,
    confidence,
    confidenceLabel: CONFIDENCE_LABEL[confidence],
    evidenceCount: active.length,
    staleCount,
    opportunities,
    areas,
    methods,
    signals,
    crossInsights,
    methodology,
    limitedEvidenceWarning,
    narrative,
  };
}

export { SIGNAL_LABEL, evaluationAreaLabel };
