/**
 * Asserts Health canônico (Fase 11).
 * Executar: npx --yes tsx src/lib/health.assert.ts
 */
import type { FeatureChannelEvaluation } from "@/types";
import {
  aggregateFeatureHealth,
  buildChannelIntelligence,
  healthSignal,
  healthToBucket,
} from "./health";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// 1. Scores bons → média
{
  const h = aggregateFeatureHealth([80, 90]);
  assert(h.score === 85, `good avg got ${h.score}`);
  assert(h.signal === "GOOD", "good signal");
  assert(h.scoredCount === 2, "scored 2");
}

// 2. Score baixo
{
  const h = aggregateFeatureHealth([40]);
  assert(h.score === 40, "low score");
  assert(h.signal === "CRITICAL", "critical");
  assert(healthToBucket(40) === "CRITICAL", "bucket critical");
}

// 3. Sem evaluation → UNKNOWN (não 0)
{
  const h = aggregateFeatureHealth([null, null]);
  assert(h.score === null, "null score");
  assert(h.signal === "UNKNOWN", "unknown");
  assert(healthToBucket(null) === "NOT_EVALUATED", "bucket not evaluated");
  assert(healthSignal(null) === "UNKNOWN", "signal unknown");
}

// 4. Canal C sem eval não puxa média para baixo como zero
{
  const h = aggregateFeatureHealth([80, 60, null]);
  assert(h.score === 70, `mixed avg got ${h.score} (C must not count as 0)`);
  assert(h.scoredCount === 2, "only 2 scored");
  assert(h.totalChannels === 3, "3 channels");
}

// 5. Só null + score → média = score único
{
  const h = aggregateFeatureHealth([null, 55, null]);
  assert(h.score === 55, "single scored");
}

// 6. Canal sem evaluations → healthScore null (não Opportunity)
{
  const intel = buildChannelIntelligence([]);
  assert(intel.healthScore == null, "empty evals → null health");
  assert(intel.healthSignal === "UNKNOWN", "empty → UNKNOWN");
  assert(intel.opportunities.length === 0, "no evals → no opportunity");
}

// 7. Stale → signal STALE; origem de opportunity não é "desatualizado"
{
  const staleEval = {
    id: "ev-stale",
    featureId: "f1",
    channelContextId: "cc1",
    area: "CX",
    methodCode: "NPS",
    methodLabel: "NPS",
    status: "NEEDS_UPDATE",
    evaluatedAt: "2020-01-01",
    createdAt: "2020-01-01",
    active: true,
    results: { score: 80, nps: 50 },
    findings: "",
    sampleSize: 100,
  } as unknown as FeatureChannelEvaluation;

  const intel = buildChannelIntelligence([staleEval]);
  const hasStaleSignal = intel.signals.some((s) => s.type === "STALE");
  assert(hasStaleSignal, "stale → Update signal");
  const staleOnlyOpp = intel.opportunities.some((o) =>
    o.origin.toLowerCase().includes("desatualiz"),
  );
  assert(!staleOnlyOpp, "stale must not create opportunity by staleness alone");
}

console.log("health.assert: OK (UNKNOWN≠0; mixed channels; stale≠opportunity)");
