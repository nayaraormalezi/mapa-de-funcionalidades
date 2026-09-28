/**
 * Asserts de regras de comentários (sem runner de testes no projeto).
 * Executar: npx --yes tsx src/lib/comments.assert.ts
 */
import { roleCan } from "./permissions";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

assert(roleCan("viewer", "comment.create"), "viewer create");
assert(roleCan("editor", "comment.create"), "editor create");
assert(roleCan("admin", "comment.create"), "admin create");

assert(!roleCan("viewer", "comment.delete"), "viewer cannot delete");
assert(roleCan("editor", "comment.delete"), "editor delete");
assert(roleCan("admin", "comment.delete"), "admin delete");

/** Flatten: parent null = root; replies attach to root even if nested attempt. */
function resolveParent(
  parentId: string | null,
  byId: Map<string, { id: string; parentCommentId: string | null }>,
): string | null {
  if (!parentId) return null;
  const parent = byId.get(parentId);
  if (!parent) return null;
  return parent.parentCommentId ?? parent.id;
}

const byId = new Map([
  ["c1", { id: "c1", parentCommentId: null }],
  ["r1", { id: "r1", parentCommentId: "c1" }],
]);

assert(resolveParent(null, byId) === null, "root has no parent");
assert(resolveParent("c1", byId) === "c1", "reply to root");
assert(resolveParent("r1", byId) === "c1", "reply to reply → root");

console.log("comments.assert: OK (permissions + 1-level threading)");
