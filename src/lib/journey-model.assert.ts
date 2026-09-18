/**
 * Asserts estrutura canônica pós-Fase 15 + catálogo vazio (Fase 15.6).
 * Executar: npx --yes tsx src/lib/journey-model.assert.ts
 */
import { demoDatabase } from "@/database/seed/demo-data";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const db = demoDatabase;

assert(db.journeys.length === 1, "seed has only jrn-consorcio");
const activeJourneys = db.journeys.filter((j) => j.active);
assert(activeJourneys.length === 1, "exactly one active journey");
assert(activeJourneys[0]!.id === "jrn-consorcio", "canonical journey id");

const stages = db.journeyStages
  .filter((s) => s.active && s.journeyId === "jrn-consorcio")
  .sort((a, b) => a.order - b.order);

assert(stages.length === 10, `expected 10 stages, got ${stages.length}`);
const expectedNames = [
  "Descoberta",
  "Consideração",
  "Contratação",
  "Onboarding",
  "Acompanhamento",
  "Lance",
  "Contemplação",
  "Uso do crédito",
  "Pós-uso",
  "Encerramento",
];
assert(
  stages.every((s, i) => s.name === expectedNames[i] && s.order === i + 1),
  "canonical stage names/order",
);

for (const name of expectedNames) {
  const asJourney = db.journeys.find((j) => j.name === name && j.active);
  assert(!asJourney, `stage "${name}" must not be an active Journey`);
}

const audiences = db.audiences.filter((a) => a.active);
assert(audiences.length === 3, "3 audiences");
assert(
  ["aud-client", "aud-economiario", "aud-partner"].every((id) =>
    audiences.some((a) => a.id === id),
  ),
  "canonical audience ids",
);

const products = db.products.filter((p) => p.active);
assert(products.length === 3, "3 products");

assert(db.channels.filter((c) => c.active).length >= 1, "channels preserved");
assert(
  db.channelContexts.filter((c) => c.active).length >= 1,
  "channel contexts preserved",
);
assert(db.roadmapPhases.length >= 1, "roadmap phases preserved");

const jas = db.journeyAudienceStages.filter((s) => s.active);
assert(jas.every((s) => s.journeyId === "jrn-consorcio"), "JAS → jrn-consorcio");
assert(
  jas.every((s) => s.journeyStageId && s.journeyStageId.startsWith("js-")),
  "JAS has journeyStageId",
);
for (const audId of ["aud-client", "aud-economiario", "aud-partner"]) {
  const linked = new Set(
    jas.filter((s) => s.audienceId === audId).map((s) => s.journeyStageId),
  );
  assert(linked.size === 10, `${audId} has 10 stages`);
}

/** Fase 15.6 — catálogo zerado */
assert(db.userNeeds.length === 0, "needs catalog empty");
assert(db.features.length === 0, "features catalog empty");
assert(db.capabilities.length === 0, "capabilities empty");
assert(db.featureNeeds.length === 0, "featureNeeds empty");
assert(db.featureJourneys.length === 0, "featureJourneys empty");
assert(db.featureChannelContexts.length === 0, "FCC empty");
assert(db.featureEvolutions.length === 0, "evolutions empty");
assert(db.evidences.length === 0, "demo evidences cleared");
assert(db.featureChannelEvaluations.length === 0, "evaluations cleared");
assert(db.gaps.length === 0, "demo issues/gaps cleared");
assert(db.roadmapItems.length === 0, "legacy roadmapItems cleared");
assert(db.journeyStages.every((s) => s.journeyId === "jrn-consorcio"), "stages only on jrn-consorcio");

console.log(
  "journey-model.assert: OK (structure preserved · catalog empty · Fase 15.6)",
);
