import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isDuplicateManualResponsible,
  joinResponsibleDisplayNames,
  normalizeManualResponsibleKey,
  validateWorkResponsibleInput,
  WORK_RESPONSIBLE_NAME_MAX,
} from "./work-responsibles.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationSrc = readFileSync(
  resolve(root, "supabase/migrations/20260929120000_fcc_responsibles.sql"),
  "utf8",
);

assert(
  migrationSrc.includes("drop table if exists public.feature_user_profiles"),
  "drops wrong feature_user_profiles",
);
assert(
  migrationSrc.includes("feature_channel_context_responsibles"),
  "creates fcc responsibles",
);
assert(
  migrationSrc.includes("feature_evolution_responsibles"),
  "creates evolution responsibles",
);
assert(migrationSrc.includes("fcc_responsibles_xor"), "fcc xor");
assert(migrationSrc.includes("evo_responsibles_xor"), "evo xor");
assert(migrationSrc.includes("log_audit"), "audit triggers");

const registered = validateWorkResponsibleInput({
  kind: "REGISTERED_USER",
  userId: "u-1",
});
assert.equal(registered.ok, true);
if (registered.ok) {
  assert.equal(registered.userId, "u-1");
  assert.equal(registered.responsibleName, null);
}

const manual = validateWorkResponsibleInput({
  kind: "MANUAL",
  responsibleName: "  Time de Desenvolvimento  ",
});
assert.equal(manual.ok, true);
if (manual.ok) {
  assert.equal(manual.responsibleName, "Time de Desenvolvimento");
  assert.equal(manual.userId, null);
}

assert.equal(
  validateWorkResponsibleInput({
    kind: "REGISTERED_USER",
    userId: "u-1",
    responsibleName: "x",
  }).ok,
  false,
);

assert.equal(
  validateWorkResponsibleInput({
    kind: "MANUAL",
    responsibleName: "a".repeat(WORK_RESPONSIBLE_NAME_MAX + 1),
  }).ok,
  false,
);

assert.equal(
  normalizeManualResponsibleKey("  João   Silva "),
  "joão silva",
);
assert.equal(
  isDuplicateManualResponsible(["João Silva"], "joão  silva"),
  true,
);
assert.equal(
  joinResponsibleDisplayNames(["Nayara", " João "]),
  "Nayara, João",
);

console.log("work-responsibles.assert: ok");
