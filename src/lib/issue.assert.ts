/**
 * Asserts Issue ≠ Coverage Gap (Fase 12).
 * Executar: npx --yes tsx src/lib/issue.assert.ts
 */
import { detectCoverageGaps } from "./coverage-gaps";
import { isCoverageGapId, ISSUE_STORAGE_TABLE } from "./issue";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(ISSUE_STORAGE_TABLE === "gaps", "physical storage remains gaps");

assert(isCoverageGapId("cov-backlog-fcc1"), "cov id is coverage");
assert(!isCoverageGapId("gap-abc"), "gap- id is issue storage");
assert(!isCoverageGapId("iss-abc"), "iss- id is issue");

const detected = detectCoverageGaps([
  {
    key: "k1",
    channelName: "App",
    phase: "BACKLOG",
    expectedDate: null,
    primaryContext: {
      channelContextId: "cc1",
      featureChannelContextId: "fcc1",
    },
  },
]);

assert(detected.length === 1, "backlog → coverage gap");
assert(isCoverageGapId(detected[0]!.id), "detected id is cov-");
assert(
  detected[0]!.title.includes("cobertura"),
  "coverage gap title mentions cobertura",
);

console.log("issue.assert: OK (Coverage Gap ≠ Issue; storage=gaps)");
