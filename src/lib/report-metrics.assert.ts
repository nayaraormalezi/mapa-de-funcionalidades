/**
 * Asserts das fórmulas de Relatórios (Fase 15.4).
 * Executar: npx --yes tsx src/lib/report-metrics.assert.ts
 */
import {
  getCoverageFeature,
  getCoverageFcc,
  getCoverageOfNeeds,
  getEvaluationCoverage,
  getExperienceHealthByFeature,
  getMappedFeatures,
  formatPercentOrEmpty,
} from "./report-metrics";
import {
  allPeriodRange,
  defaultPeriodRange,
  formatRangeBR,
  periodHasReportResults,
  periodIncludesToday,
  validateComparison,
  validateDateRange,
  type TemporalEvent,
} from "./report-period";
import type { Feature, FeatureMapRow, UserNeed } from "@/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function row(
  partial: Partial<FeatureMapRow> &
    Pick<FeatureMapRow, "featureId" | "phase" | "healthScore">,
): FeatureMapRow {
  return {
    featureName: partial.featureId,
    featureDescription: "",
    productId: "imobiliario",
    product: "Imobiliário",
    productShortName: "Imobiliário",
    priority: "MEDIUM",
    owner: "",
    uxOwner: "",
    cxOwner: "",
    productOwner: "",
    isDemo: true,
    audienceId: "aud-client",
    audienceCode: "CLIENT",
    audienceName: "Cliente",
    momentId: "mom-venda",
    momentCode: "SALE",
    momentName: "Venda",
    journeyId: "jrn-consorcio",
    journeyName: "Consórcio",
    journeyStageId: "stg-1",
    journeyStageName: "Descoberta",
    userNeedId: "need-1",
    userNeedName: "Need",
    capabilityId: "",
    capabilityName: "",
    channelId: "ch-1",
    channelName: "SuperApp",
    channelContextId: "cc-1",
    temporalStatus: "CURRENT",
    featureChannelContextId: `fcc-${partial.featureId}`,
    status: "NO_DEADLINE",
    experience: "NOT_EVALUATED",
    healthSignal:
      partial.healthScore == null
        ? "UNKNOWN"
        : partial.healthScore >= 70
          ? "GOOD"
          : partial.healthScore >= 40
            ? "ATTENTION"
            : "CRITICAL",
    startDate: null,
    expectedDate: null,
    launchDate: null,
    responsible: "",
    notes: "",
    ...partial,
  };
}

assert(formatPercentOrEmpty(null) === "Sem dados", "null % label");
assert(getCoverageFeature([]).percentage === null, "empty coverage → null");

const rows: FeatureMapRow[] = [
  row({ featureId: "f1", phase: "AVAILABLE", healthScore: 80 }),
  row({
    featureId: "f1",
    phase: "BACKLOG",
    healthScore: null,
    featureChannelContextId: "fcc-f1-b",
    channelId: "ch-2",
  }),
  row({ featureId: "f2", phase: "BACKLOG", healthScore: null }),
];

assert(getMappedFeatures(rows) === 2, "mapped = 2");
assert(getCoverageFeature(rows).numerator === 1, "feature cov 1");
assert(getCoverageFcc(rows).denominator === 3, "fcc denom 3");

const evalCov = getEvaluationCoverage(rows);
assert(evalCov.numerator === 1 && evalCov.denominator === 2, "eval cov 1/2");

const health = getExperienceHealthByFeature(rows);
assert(health.every((h) => h.level !== "NOT_EVALUATED"), "no NOT_EVAL in health");
assert(health.find((h) => h.level === "GOOD")?.count === 1, "1 GOOD");
const sum = health.reduce((a, h) => a + (h.percentage ?? 0), 0);
assert(Math.abs(sum - 100) < 0.01, "health % among evaluated = 100");

const needs: UserNeed[] = [
  {
    id: "need-1",
    journeyId: "jrn-consorcio",
    journeyStageId: "stg-1",
    productId: "imobiliario",
    productIds: ["imobiliario"],
    audienceIds: ["aud-client"],
    name: "N1",
    description: "",
    measurement: "",
    priority: "MEDIUM",
    active: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "need-2",
    journeyId: "jrn-consorcio",
    journeyStageId: "stg-1",
    productId: "imobiliario",
    productIds: [],
    audienceIds: [],
    name: "N2",
    description: "",
    measurement: "",
    priority: "MEDIUM",
    active: true,
    createdAt: "",
    updatedAt: "",
  },
];

const features: Feature[] = [
  {
    id: "f1",
    capabilityId: null,
    name: "F1",
    description: "",
    product: "Imobiliário",
    productIds: ["imobiliario"],
    needIds: ["need-1"],
    journeyIds: ["jrn-consorcio"],
    priority: "MEDIUM",
    owner: "",
    uxOwner: "",
    cxOwner: "",
    productOwner: "",
    active: true,
    isDemo: true,
    createdAt: "",
    updatedAt: "",
  } as Feature,
];

const needCov = getCoverageOfNeeds(needs, features, rows, {});
assert(needCov.numerator === 1 && needCov.denominator === 2, "needs 1/2");
assert(getCoverageOfNeeds([], features, rows).percentage === null, "no needs → null");

assert(validateDateRange({ mode: "custom", start: "2026-09-01", end: "2026-08-01" }) != null, "start>end invalid");
assert(
  validateComparison(
    { mode: "custom", start: "2026-07-01", end: "2026-09-30" },
    { mode: "custom", start: "2026-04-01", end: "2026-04-30" },
  ) != null,
  "unequal lengths invalid",
);
assert(
  validateComparison(allPeriodRange(), defaultPeriodRange()) != null,
  "all vs custom not comparable",
);

const todayRange = defaultPeriodRange();
assert(periodIncludesToday(todayRange), "default includes today");
assert(periodHasReportResults(todayRange, []), "today range has results");
assert(periodIncludesToday(allPeriodRange()), "all includes today");
assert(periodHasReportResults(allPeriodRange(), []), "all has current-state results");
assert(formatRangeBR(allPeriodRange()) === "Todo o período", "all label");

const past: TemporalEvent[] = [];
assert(
  !periodHasReportResults(
    { mode: "custom", start: "2020-01-01", end: "2020-01-31" },
    past,
  ),
  "past empty → no results",
);
assert(
  periodHasReportResults(
    { mode: "custom", start: "2020-01-01", end: "2020-01-31" },
    [{ id: "1", kind: "evaluation", date: "2020-01-15", label: "x" }],
  ),
  "past with events → results",
);

console.log(
  "report-metrics.assert: OK (needs; health≠não-avaliada; período sem dados; Feature≠FCC)",
);
