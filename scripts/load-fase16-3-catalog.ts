/**
 * Fase 16.3 — carga em lote idempotente do catálogo estrutural.
 *
 * Uso:
 *   npx tsx scripts/load-fase16-3-catalog.ts --dry-run
 *   npx tsx scripts/load-fase16-3-catalog.ts --apply
 *
 * Requer LIVE: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local).
 * Não cria FCC, canais, produtos, status, tickets, Figma, evoluções, melhorias.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  FASE16_3_AUDIENCE_IDS,
  FASE16_3_JAS,
  FASE16_3_JOURNEY_ID,
  FASE16_3_NEEDS,
  FASE16_3_STAGE_IDS,
  canonicalFeatureName,
  normalizeFeatureLabel,
  slugify,
  uniqueCanonicalFeatures,
} from "../src/database/seed/fase16-3-catalog-data";
import { DEFAULT_PRODUCT, DEFAULT_PRODUCT_ID } from "../src/lib/products";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

type Row = Record<string, unknown>;

type Plan = {
  journey: {
    id: string;
    status: "found" | "create";
    name: string;
    description: string;
  };
  stages: {
    expected: number;
    found: number;
    missing: string[];
    /** Etapas canônicas cujo journey_id ainda aponta para jornada legado. */
    toRebind: { id: string; fromJourneyId: string }[];
  };
  audiences: { expected: number; found: number; missing: string[] };
  /** Jornadas legado ativas — apenas reportadas; NÃO desativar automaticamente. */
  legacyJourneysActive: string[];
  schema: {
    jasHasJourneyStageId: boolean;
  };
  jas: {
    planned: number;
    toCreate: {
      id: string;
      audienceId: string;
      stageId: string;
      displayName: string;
      sortOrder: number;
      momentId: string;
    }[];
    toUpdate: {
      id: string;
      audienceId: string;
      stageId: string;
      displayName: string;
      sortOrder: number;
      momentId: string;
      reason: string;
    }[];
    ok: number;
  };
  features: {
    plannedUnique: number;
    toCreate: {
      id: string;
      name: string;
      capabilityId: string;
      primaryNeedId: string;
    }[];
    reuse: { id: string; name: string }[];
  };
  capabilities: {
    toCreate: {
      id: string;
      userNeedId: string;
      name: string;
    }[];
  };
  needs: {
    planned: number;
    toCreate: {
      id: string;
      key: string;
      name: string;
      stageId: string;
      audienceId: string;
    }[];
    reuse: { id: string; key: string; name: string }[];
  };
  links: {
    featureNeedsToCreate: { featureId: string; needId: string }[];
    featureNeedsExisting: number;
    featureJourneysToCreate: { featureId: string; journeyId: string }[];
    featureJourneysExisting: number;
  };
  conflicts: string[];
};

const CANONICAL_JOURNEY = {
  id: FASE16_3_JOURNEY_ID,
  name: "Jornada do Consórcio",
  description:
    "Jornada compartilhada do consórcio CAIXA — da descoberta ao encerramento. As etapas são JourneyStages; públicos compartilham a mesma estrutura.",
};

/** IDs de jornadas legado (uma por etapa) — apenas auditoria. */
const LEGACY_STAGE_JOURNEY_IDS = [
  "jrn-descoberta",
  "jrn-consideracao",
  "jrn-contratacao",
  "jrn-onboarding",
  "jrn-acompanhamento",
  "jrn-lance",
  "jrn-contemplacao",
  "jrn-uso-credito",
  "jrn-pos-uso",
  "jrn-encerramento",
  "jrn-financeiro",
] as const;

function newDeterministicId(prefix: string, slug: string) {
  return `${prefix}-f163-${slug}`.slice(0, 64);
}

function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchAll(
  supabase: SupabaseClient,
  table: string,
  columns = "*",
): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as unknown as Row[];
}

async function buildPlan(supabase: SupabaseClient): Promise<Plan> {
  const conflicts: string[] = [];

  const journeys = await fetchAll(supabase, "journeys");
  const journey = journeys.find((j) => j.id === FASE16_3_JOURNEY_ID);
  if (!journey) {
    conflicts.push(
      `Jornada ${FASE16_3_JOURNEY_ID} ausente — será criada (idempotente) com o ID canônico.`,
    );
  }

  const stages = await fetchAll(supabase, "journey_stages");
  const stageById = new Map(
    stages.filter((s) => s.active !== false).map((s) => [String(s.id), s]),
  );
  const expectedStageIds = Object.values(FASE16_3_STAGE_IDS);
  const missingStages = expectedStageIds.filter((id) => !stageById.has(id));
  const stagesToRebind = expectedStageIds
    .map((id) => stageById.get(id))
    .filter((s): s is Row => Boolean(s))
    .filter((s) => String(s.journey_id) !== FASE16_3_JOURNEY_ID)
    .map((s) => ({
      id: String(s.id),
      fromJourneyId: String(s.journey_id),
    }));

  if (stagesToRebind.length) {
    conflicts.push(
      `${stagesToRebind.length} etapa(s) canônicas serão reapontadas para ${FASE16_3_JOURNEY_ID} (hoje ligadas a jornadas legado).`,
    );
  }

  const audiences = await fetchAll(supabase, "audiences");
  const audienceById = new Map(
    audiences.filter((a) => a.active !== false).map((a) => [String(a.id), a]),
  );
  const expectedAudienceIds = Object.values(FASE16_3_AUDIENCE_IDS);
  const missingAudiences = expectedAudienceIds.filter(
    (id) => !audienceById.has(id),
  );

  const legacyJourneysActive = LEGACY_STAGE_JOURNEY_IDS.filter((id) => {
    const j = journeys.find((row) => String(row.id) === id);
    return Boolean(j && j.active !== false);
  });

  // Schema: journey_audience_stages.journey_stage_id
  let jasHasJourneyStageId = true;
  {
    const probe = await supabase
      .from("journey_audience_stages")
      .select("journey_stage_id")
      .limit(1);
    if (probe.error && /journey_stage_id/i.test(probe.error.message)) {
      jasHasJourneyStageId = false;
      conflicts.push(
        "Schema incompatível: journey_audience_stages.journey_stage_id ausente. Aplique a migration jas_journey_stage_id antes da carga.",
      );
    }
  }

  const jasRows = jasHasJourneyStageId
    ? await fetchAll(supabase, "journey_audience_stages")
    : [];
  const jasByAudienceStage = new Map<string, Row>();
  for (const row of jasRows) {
    if (row.active === false) continue;
    const stageId = String(row.journey_stage_id ?? "");
    if (!stageId) continue;
    jasByAudienceStage.set(`${String(row.audience_id)}|${stageId}`, row);
  }

  const jasToCreate: Plan["jas"]["toCreate"] = [];
  const jasToUpdate: Plan["jas"]["toUpdate"] = [];
  let jasOk = 0;

  if (jasHasJourneyStageId) {
    for (const seed of FASE16_3_JAS) {
      const audienceId = FASE16_3_AUDIENCE_IDS[seed.audience];
      const stageId = FASE16_3_STAGE_IDS[seed.stage];
      const key = `${audienceId}|${stageId}`;
      const existing = jasByAudienceStage.get(key);
      if (!existing) {
        jasToCreate.push({
          id: seed.id,
          audienceId,
          stageId,
          displayName: seed.displayName,
          sortOrder: seed.sortOrder,
          momentId: seed.momentId,
        });
      } else {
        const needsUpdate =
          String(existing.journey_id) !== FASE16_3_JOURNEY_ID ||
          String(existing.display_name) !== seed.displayName ||
          Number(existing.sort_order) !== seed.sortOrder ||
          String(existing.moment_id) !== seed.momentId ||
          String(existing.journey_stage_id) !== stageId;
        if (needsUpdate) {
          jasToUpdate.push({
            id: String(existing.id),
            audienceId,
            stageId,
            displayName: seed.displayName,
            sortOrder: seed.sortOrder,
            momentId: seed.momentId,
            reason:
              String(existing.journey_id) !== FASE16_3_JOURNEY_ID
                ? `rebind ${existing.journey_id} → ${FASE16_3_JOURNEY_ID}`
                : "sync display/ordem/momento",
          });
        } else {
          jasOk += 1;
        }
      }
    }
  }

  const features = await fetchAll(supabase, "features");
  const featureByNorm = new Map<string, Row>();
  for (const f of features) {
    if (f.active === false) continue;
    const key = normalizeFeatureLabel(String(f.name ?? ""));
    if (!featureByNorm.has(key)) featureByNorm.set(key, f);
  }

  const uniqueFeatures = uniqueCanonicalFeatures();
  const featuresToCreate: Plan["features"]["toCreate"] = [];
  const featuresReuse: { id: string; name: string }[] = [];
  const featureIdByNorm = new Map<string, string>();
  const capabilitiesToCreate: Plan["capabilities"]["toCreate"] = [];

  // Precisa dos need IDs antes de montar capabilities das features novas.
  // (needsToCreate / needsReuse preenchidos abaixo; feature plan usa needIdBySeedKey.)

  const needs = await fetchAll(supabase, "user_needs");
  const needByKey = new Map<string, Row>();
  for (const n of needs) {
    if (n.active === false) continue;
    const stageId = String(n.journey_stage_id ?? "");
    const audienceIds = Array.isArray(n.audience_ids)
      ? (n.audience_ids as string[])
      : [];
    const nameKey = normalizeFeatureLabel(String(n.name ?? ""));
    for (const aud of audienceIds.length ? audienceIds : ["*"]) {
      needByKey.set(`${stageId}|${aud}|${nameKey}`, n);
    }
  }

  const needsToCreate: Plan["needs"]["toCreate"] = [];
  const needsReuse: Plan["needs"]["reuse"] = [];
  const needIdBySeedKey = new Map<string, string>();

  for (const seed of FASE16_3_NEEDS) {
    const stageId = FASE16_3_STAGE_IDS[seed.stage];
    const audienceId = FASE16_3_AUDIENCE_IDS[seed.audience];
    const nameKey = normalizeFeatureLabel(seed.name);
    const matchKey = `${stageId}|${audienceId}|${nameKey}`;
    const existing = needByKey.get(matchKey);
    if (existing) {
      const id = String(existing.id);
      needIdBySeedKey.set(seed.key, id);
      needsReuse.push({ id, key: seed.key, name: String(existing.name) });
    } else {
      const id = newDeterministicId("need", `${seed.key}-${slugify(seed.name)}`);
      needIdBySeedKey.set(seed.key, id);
      needsToCreate.push({
        id,
        key: seed.key,
        name: seed.name,
        stageId,
        audienceId,
      });
    }
  }

  /** Primeira necessidade (seed) que cita cada feature canônica. */
  const primaryNeedByFeatureNorm = new Map<string, string>();
  for (const seed of FASE16_3_NEEDS) {
    for (const raw of seed.features) {
      const fname = canonicalFeatureName(raw);
      const key = normalizeFeatureLabel(fname);
      if (!primaryNeedByFeatureNorm.has(key)) {
        primaryNeedByFeatureNorm.set(key, needIdBySeedKey.get(seed.key)!);
      }
    }
  }

  for (const name of uniqueFeatures) {
    const key = normalizeFeatureLabel(name);
    const existing = featureByNorm.get(key);
    if (existing) {
      const id = String(existing.id);
      featureIdByNorm.set(key, id);
      featuresReuse.push({ id, name: String(existing.name) });
      if (normalizeFeatureLabel(String(existing.name)) !== key) {
        conflicts.push(
          `Feature existente com nome divergente: DB="${existing.name}" vs catálogo="${name}" (reusando id ${id})`,
        );
      }
    } else {
      const id = newDeterministicId("feat", slugify(name));
      const primaryNeedId = primaryNeedByFeatureNorm.get(key)!;
      const capabilityId = newDeterministicId("cap", slugify(name));
      featureIdByNorm.set(key, id);
      featuresToCreate.push({ id, name, capabilityId, primaryNeedId });
      capabilitiesToCreate.push({
        id: capabilityId,
        userNeedId: primaryNeedId,
        name: `Capacidade · ${name}`,
      });
    }
  }

  const featureNeeds = await fetchAll(supabase, "feature_needs");
  const existingFn = new Set(
    featureNeeds.map(
      (r) => `${String(r.feature_id)}|${String(r.user_need_id)}`,
    ),
  );
  const featureJourneys = await fetchAll(supabase, "feature_journeys");
  const existingFj = new Set(
    featureJourneys.map(
      (r) => `${String(r.feature_id)}|${String(r.journey_id)}`,
    ),
  );

  const featureNeedsToCreate: { featureId: string; needId: string }[] = [];
  const featureJourneysToCreate: { featureId: string; journeyId: string }[] =
    [];
  let featureNeedsExisting = 0;
  let featureJourneysExisting = 0;

  for (const seed of FASE16_3_NEEDS) {
    const needId = needIdBySeedKey.get(seed.key)!;
    for (const raw of seed.features) {
      const fname = canonicalFeatureName(raw);
      const featureId = featureIdByNorm.get(normalizeFeatureLabel(fname))!;
      const fnKey = `${featureId}|${needId}`;
      if (existingFn.has(fnKey)) {
        featureNeedsExisting += 1;
      } else {
        featureNeedsToCreate.push({ featureId, needId });
        existingFn.add(fnKey);
      }
    }
  }

  for (const featureId of new Set(featureIdByNorm.values())) {
    const fjKey = `${featureId}|${FASE16_3_JOURNEY_ID}`;
    if (existingFj.has(fjKey)) {
      featureJourneysExisting += 1;
    } else {
      featureJourneysToCreate.push({
        featureId,
        journeyId: FASE16_3_JOURNEY_ID,
      });
      existingFj.add(fjKey);
    }
  }

  if (missingStages.length) {
    conflicts.push(`Etapas ausentes: ${missingStages.join(", ")}`);
  }
  if (missingAudiences.length) {
    conflicts.push(`Públicos ausentes: ${missingAudiences.join(", ")}`);
  }

  return {
    journey: {
      id: CANONICAL_JOURNEY.id,
      status: journey ? "found" : "create",
      name: CANONICAL_JOURNEY.name,
      description: CANONICAL_JOURNEY.description,
    },
    stages: {
      expected: expectedStageIds.length,
      found: expectedStageIds.length - missingStages.length,
      missing: missingStages,
      toRebind: stagesToRebind,
    },
    audiences: {
      expected: expectedAudienceIds.length,
      found: expectedAudienceIds.length - missingAudiences.length,
      missing: missingAudiences,
    },
    legacyJourneysActive,
    schema: { jasHasJourneyStageId },
    jas: {
      planned: FASE16_3_JAS.length,
      toCreate: jasToCreate,
      toUpdate: jasToUpdate,
      ok: jasOk,
    },
    features: {
      plannedUnique: uniqueFeatures.length,
      toCreate: featuresToCreate,
      reuse: featuresReuse,
    },
    capabilities: { toCreate: capabilitiesToCreate },
    needs: {
      planned: FASE16_3_NEEDS.length,
      toCreate: needsToCreate,
      reuse: needsReuse,
    },
    links: {
      featureNeedsToCreate,
      featureNeedsExisting,
      featureJourneysToCreate,
      featureJourneysExisting,
    },
    conflicts,
  };
}

function printPlan(plan: Plan) {
  console.log("\n=== Fase 16.3 — dry-run / plano ===\n");
  console.log(`Jornada ${plan.journey.id}: ${plan.journey.status}`);
  console.log(
    `Etapas: ${plan.stages.found}/${plan.stages.expected}` +
      (plan.stages.missing.length
        ? ` (faltando: ${plan.stages.missing.join(", ")})`
        : ""),
  );
  if (plan.stages.toRebind.length) {
    console.log(
      `  reapontar para ${FASE16_3_JOURNEY_ID}: ${plan.stages.toRebind.length}`,
    );
  }
  console.log(
    `Públicos: ${plan.audiences.found}/${plan.audiences.expected}` +
      (plan.audiences.missing.length
        ? ` (faltando: ${plan.audiences.missing.join(", ")})`
        : ""),
  );
  console.log(
    `Schema JAS.journey_stage_id: ${plan.schema.jasHasJourneyStageId ? "OK" : "AUSENTE"}`,
  );
  console.log("\nJourneyAudienceStage (3×10):");
  console.log(`  pretendidos: ${plan.jas.planned}`);
  console.log(`  ok:          ${plan.jas.ok}`);
  console.log(`  criar:       ${plan.jas.toCreate.length}`);
  console.log(`  atualizar:   ${plan.jas.toUpdate.length}`);
  if (plan.legacyJourneysActive.length) {
    console.log(
      `\nJornadas legado ainda ativas (não serão desativadas automaticamente): ${plan.legacyJourneysActive.join(", ")}`,
    );
  }
  console.log("\nNecessidades:");
  console.log(`  pretendidas: ${plan.needs.planned}`);
  console.log(`  criar:       ${plan.needs.toCreate.length}`);
  console.log(`  já existem:  ${plan.needs.reuse.length}`);
  console.log("\nFuncionalidades (únicas):");
  console.log(`  pretendidas: ${plan.features.plannedUnique}`);
  console.log(`  criar:       ${plan.features.toCreate.length}`);
  console.log(`  já existem:  ${plan.features.reuse.length}`);
  console.log("\nRelacionamentos:");
  console.log(
    `  feature_needs criar: ${plan.links.featureNeedsToCreate.length} | existentes: ${plan.links.featureNeedsExisting}`,
  );
  console.log(
    `  feature_journeys criar: ${plan.links.featureJourneysToCreate.length} | existentes: ${plan.links.featureJourneysExisting}`,
  );
  if (plan.conflicts.length) {
    console.log("\nConflitos / avisos:");
    for (const c of plan.conflicts) console.log(`  - ${c}`);
  } else {
    console.log("\nConflitos: nenhum");
  }
}

async function applyPlan(supabase: SupabaseClient, plan: Plan) {
  if (!plan.schema.jasHasJourneyStageId) {
    throw new Error(
      "Abortado: migration journey_audience_stages.journey_stage_id ausente.",
    );
  }
  if (plan.stages.missing.length || plan.audiences.missing.length) {
    throw new Error(
      "Abortado: etapas ou públicos canônicos ausentes. Corrija o catálogo base antes da carga.",
    );
  }

  const now = new Date().toISOString();

  // 1) Jornada canônica
  if (plan.journey.status === "create") {
    const { error } = await supabase.from("journeys").upsert({
      id: plan.journey.id,
      name: plan.journey.name,
      description: plan.journey.description,
      sort_order: 1,
      active: true,
      created_at: now,
      updated_at: now,
    });
    if (error) throw new Error(`journeys upsert: ${error.message}`);
  }

  // 2) Reapontar etapas canônicas → jrn-consorcio
  for (const stage of plan.stages.toRebind) {
    const { error } = await supabase
      .from("journey_stages")
      .update({ journey_id: FASE16_3_JOURNEY_ID, updated_at: now })
      .eq("id", stage.id);
    if (error) {
      throw new Error(`journey_stages rebind ${stage.id}: ${error.message}`);
    }
  }

  // 3) JAS canônicos (update por audience×stage existente; insert se ausente)
  for (const row of plan.jas.toUpdate) {
    const { error } = await supabase
      .from("journey_audience_stages")
      .update({
        journey_id: FASE16_3_JOURNEY_ID,
        journey_stage_id: row.stageId,
        display_name: row.displayName,
        sort_order: row.sortOrder,
        moment_id: row.momentId,
        active: true,
        updated_at: now,
      })
      .eq("id", row.id);
    if (error) throw new Error(`jas update ${row.id}: ${error.message}`);
  }
  if (plan.jas.toCreate.length) {
    const { error } = await supabase.from("journey_audience_stages").upsert(
      plan.jas.toCreate.map((j) => ({
        id: j.id,
        audience_id: j.audienceId,
        journey_id: FASE16_3_JOURNEY_ID,
        journey_stage_id: j.stageId,
        display_name: j.displayName,
        sort_order: j.sortOrder,
        moment_id: j.momentId,
        active: true,
        created_at: now,
        updated_at: now,
      })),
    );
    if (error) throw new Error(`jas insert: ${error.message}`);
  }

  // 4) Necessidades primeiro (capabilities / features dependem delas)
  if (plan.needs.toCreate.length) {
    // product_ids vazio = transversal; product_id legado preenchido só por FK (igual upsertUserNeed).
    const rows = plan.needs.toCreate.map((n) => ({
      id: n.id,
      journey_id: FASE16_3_JOURNEY_ID,
      journey_stage_id: n.stageId,
      product_id: DEFAULT_PRODUCT_ID,
      product_ids: [] as string[],
      audience_ids: [n.audienceId],
      name: n.name,
      description: "",
      measurement: "",
      priority: "MEDIUM",
      active: true,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from("user_needs").upsert(rows);
    if (error) throw new Error(`user_needs upsert: ${error.message}`);
  }

  // 5) Capabilities (coluna features.capability_id é NOT NULL no LIVE)
  if (plan.capabilities.toCreate.length) {
    const rows = plan.capabilities.toCreate.map((c) => ({
      id: c.id,
      user_need_id: c.userNeedId,
      name: c.name,
      description: `Capacidade gerada na carga Fase 16.3 para "${c.name.replace(/^Capacidade · /, "")}".`,
      active: true,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from("capabilities").upsert(rows);
    if (error) throw new Error(`capabilities upsert: ${error.message}`);
  }

  if (plan.features.toCreate.length) {
    // product_ids vazio = transversal (não inferir produto nesta fase).
    // Coluna legada `product` exige texto; usa default do CRUD sem vincular product_ids.
    const rows = plan.features.toCreate.map((f) => ({
      id: f.id,
      capability_id: f.capabilityId,
      name: f.name,
      description: "",
      product: DEFAULT_PRODUCT,
      product_ids: [] as string[],
      priority: "MEDIUM",
      owner: "",
      ux_owner: "",
      cx_owner: "",
      product_owner: "",
      active: true,
      is_demo: false,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await supabase.from("features").upsert(rows);
    if (error) throw new Error(`features upsert: ${error.message}`);
  }

  if (plan.links.featureNeedsToCreate.length) {
    const { error } = await supabase
      .from("feature_needs")
      .upsert(
        plan.links.featureNeedsToCreate.map((l) => ({
          feature_id: l.featureId,
          user_need_id: l.needId,
        })),
        { onConflict: "feature_id,user_need_id" },
      );
    if (error) throw new Error(`feature_needs upsert: ${error.message}`);
  }

  if (plan.links.featureJourneysToCreate.length) {
    const { error } = await supabase
      .from("feature_journeys")
      .upsert(
        plan.links.featureJourneysToCreate.map((l) => ({
          feature_id: l.featureId,
          journey_id: l.journeyId,
        })),
        { onConflict: "feature_id,journey_id" },
      );
    if (error) throw new Error(`feature_journeys upsert: ${error.message}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const dryRun = args.has("--dry-run") || !apply;

  if (!apply && !args.has("--dry-run")) {
    console.log("Modo padrão: --dry-run (passe --apply para gravar).\n");
  }

  const supabase = adminClient();
  const plan = await buildPlan(supabase);
  printPlan(plan);

  if (dryRun && !apply) {
    console.log("\nNenhuma alteração gravada (dry-run).");
    return;
  }

  console.log("\nAplicando carga…");
  await applyPlan(supabase, plan);
  console.log("Carga aplicada com sucesso.");

  const after = await buildPlan(supabase);
  console.log("\n=== Pós-carga ===");
  console.log(
    `Needs criar restantes: ${after.needs.toCreate.length} | Features criar restantes: ${after.features.toCreate.length}`,
  );
  console.log(
    `Links FN criar restantes: ${after.links.featureNeedsToCreate.length}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
