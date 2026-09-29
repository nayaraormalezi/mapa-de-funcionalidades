import assert from "node:assert/strict";

/** Helpers espelhando a resolução de contexto do quick view (teste puro). */
function resolvePrimary<T extends { id: string }>(
  contexts: T[],
  focusImplId?: string | null,
): T | null {
  if (focusImplId) {
    const hit = contexts.find((c) => c.id === focusImplId);
    if (hit) return hit;
  }
  return contexts[0] ?? null;
}

function otherContextsExcludingPrimary<T extends { id: string }>(
  contexts: T[],
  primaryId: string | null | undefined,
): T[] {
  return contexts.filter((c) => c.id !== primaryId);
}

const contexts = [
  { id: "fcc-area", channel: "Área logada", phase: "HOMOLOGATION" },
  { id: "fcc-super", channel: "SuperApp CAIXA", phase: "DEVELOPMENT" },
];

const fromSuper = resolvePrimary(contexts, "fcc-super");
assert.equal(fromSuper?.id, "fcc-super");
assert.equal(fromSuper?.phase, "DEVELOPMENT");

const fromArea = resolvePrimary(contexts, "fcc-area");
assert.equal(fromArea?.id, "fcc-area");
assert.equal(fromArea?.phase, "HOMOLOGATION");

const othersFromSuper = otherContextsExcludingPrimary(contexts, fromSuper?.id);
assert.equal(othersFromSuper.length, 1);
assert.equal(othersFromSuper[0]?.id, "fcc-area");
assert.ok(!othersFromSuper.some((c) => c.id === "fcc-super"));

const othersFromArea = otherContextsExcludingPrimary(contexts, fromArea?.id);
assert.equal(othersFromArea.length, 1);
assert.equal(othersFromArea[0]?.id, "fcc-super");

console.log("roadmap-quick-view.assert: ok");
