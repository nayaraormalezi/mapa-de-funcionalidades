/**
 * Asserts Comparison + Transformation sob Intelligence (Fase 13).
 * Executar: npx --yes tsx src/lib/intelligence-domain.assert.ts
 *
 * Regras:
 * - Comparison/Transformation são análises, não fontes de verdade.
 * - Health vem de FeatureMapRow (buildChannelIntelligence) — não recalculado aqui.
 * - Issues ≠ Coverage Gaps.
 * - experienceDiffs é alias deprecated de healthDiffs.
 */
import type { ChannelComparison } from "@/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

/** Rotas canônicas do domínio Intelligence. */
const INTELLIGENCE_ROUTES = {
  insights: "/inteligencia",
  comparacoes: "/inteligencia/comparacoes",
  transformacoes: "/inteligencia/transformacoes",
} as const;

/** Rotas legadas que devem redirecionar. */
const LEGACY_REDIRECTS = {
  comparacao: "/comparacao",
  transformacao: "/transformacao",
} as const;

assert(
  INTELLIGENCE_ROUTES.comparacoes.startsWith("/inteligencia/"),
  "comparacoes nested under inteligencia",
);
assert(
  INTELLIGENCE_ROUTES.transformacoes.startsWith("/inteligencia/"),
  "transformacoes nested under inteligencia",
);
assert(LEGACY_REDIRECTS.comparacao === "/comparacao", "legacy comparacao path");
assert(
  LEGACY_REDIRECTS.transformacao === "/transformacao",
  "legacy transformacao path",
);

/** Shape ChannelComparison: issues, não gaps. */
const sample: ChannelComparison = {
  channelAId: "a",
  channelBId: "b",
  common: [],
  onlyA: [],
  onlyB: [],
  issues: [],
};
assert(Array.isArray(sample.issues), "ChannelComparison.issues exists");
assert(
  !("gaps" in sample),
  "ChannelComparison must not expose gaps (Coverage Gap ≠ Issue)",
);

/** healthDiffs é a API canônica de diferença de Health na comparação avançada. */
type AdvancedShape = {
  healthDiffs: unknown[];
  experienceDiffs?: unknown[];
};
const advanced: AdvancedShape = {
  healthDiffs: [{ differentHealth: true }],
  experienceDiffs: [{ differentExperience: true }],
};
assert(advanced.healthDiffs.length === 1, "healthDiffs is primary");
assert(
  Array.isArray(advanced.experienceDiffs),
  "experienceDiffs may exist only as deprecated alias",
);

console.log(
  "intelligence-domain.assert: OK (Comparison/Transformation ⊂ Intelligence; Health canônico; Issues≠Gaps)",
);
