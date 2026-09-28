/**
 * Asserts da matriz de permissões (sem runner de testes no projeto).
 * Executar: npx --yes tsx src/lib/permissions.assert.ts
 */
import {
  roleCan,
  roleCanAdmin,
  roleCanEdit,
  type Permission,
} from "./permissions";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const operational: Permission[] = [
  "feature.create",
  "feature.edit",
  "implementation.edit",
  "evaluation.create",
  "evidence.create",
  "evolution.create",
  "issue.create",
  "issue.resolve",
  "channel.edit",
  "journey.edit",
];

for (const p of operational) {
  assert(!roleCan("viewer", p), `viewer must not ${p}`);
  assert(roleCan("editor", p), `editor must ${p}`);
  assert(roleCan("admin", p), `admin must ${p}`);
}

assert(roleCan("viewer", "view"), "viewer can view");
assert(roleCan("viewer", "comment.create"), "viewer can comment");
assert(roleCan("editor", "comment.create"), "editor can comment");
assert(roleCan("admin", "comment.create"), "admin can comment");
assert(!roleCan("viewer", "comment.delete"), "viewer !delete comment");
assert(roleCan("editor", "comment.delete"), "editor delete comment");
assert(roleCan("admin", "comment.delete"), "admin delete comment");
assert(!roleCanEdit("viewer"), "viewer !canEdit");
assert(roleCanEdit("editor"), "editor canEdit");
assert(roleCanEdit("admin"), "admin canEdit");

assert(!roleCanAdmin("viewer"), "viewer !canAdmin");
assert(!roleCanAdmin("editor"), "editor !canAdmin");
assert(roleCanAdmin("admin"), "admin canAdmin");

assert(!roleCan("editor", "taxonomy.manage"), "editor !taxonomy");
assert(!roleCan("editor", "users.manage"), "editor !users");
assert(roleCan("admin", "taxonomy.manage"), "admin taxonomy");
assert(roleCan("admin", "users.manage"), "admin users");

// Critério: canEdit ≠ canAdmin
assert(roleCanEdit("editor") && !roleCanAdmin("editor"), "canEdit ≠ canAdmin");

console.log("permissions.assert: OK (viewer/editor/admin matrix)");
