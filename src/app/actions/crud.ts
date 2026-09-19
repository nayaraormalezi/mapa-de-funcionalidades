"use server";

import { revalidatePath } from "next/cache";
import { requireCanEdit } from "@/lib/auth";
import {
  normalizeEvolutionOrigin,
  reconcileEvolutionStatusPhase,
} from "@/lib/evolution";
import { DEFAULT_PRODUCT, getProductMeta, parseProductId, resolveProductId } from "@/lib/products";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import { invalidateDatabaseCache } from "@/services/db";

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

/** Operacional: Editor + Admin (e LIVE). */
async function guardMutation(): Promise<ActionResult | null> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Modo demonstração: alterações não são gravadas. Ative NEXT_PUBLIC_USE_SUPABASE=true com URL e chave válidas para persistir no Supabase.",
    };
  }
  const gate = await requireCanEdit();
  if (!gate.ok) return { ok: false, message: gate.message };
  return null;
}

function revalidateAll() {
  invalidateDatabaseCache();
  revalidatePath("/", "layout");
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Archive = soft delete (active = false). No hard deletes in MVP. */
export async function archiveRecord(
  table: string,
  id: string,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .update({ active: false })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Registro arquivado.", id };
}

export async function upsertFeature(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("feat");
  const productIdsRaw = String(formData.get("product_ids") ?? "").trim();
  const needIdsRaw = String(formData.get("need_ids") ?? "").trim();
  const journeyIdsRaw = String(formData.get("journey_ids") ?? "").trim();
  const productIds = productIdsRaw
    ? productIdsRaw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : null;
  const needIds = needIdsRaw
    ? needIdsRaw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : null;
  const journeyIds = journeyIdsRaw
    ? journeyIdsRaw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : null;

  const payload: Record<string, unknown> = {
    id,
    capability_id: String(formData.get("capability_id") ?? "") || null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    product: String(formData.get("product") ?? DEFAULT_PRODUCT).trim(),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    owner: String(formData.get("owner") ?? "").trim(),
    ux_owner: String(formData.get("ux_owner") ?? "").trim(),
    cx_owner: String(formData.get("cx_owner") ?? "").trim(),
    product_owner: String(formData.get("product_owner") ?? "").trim(),
    active: formData.get("active") !== "false",
    is_demo: formData.get("is_demo") === "true",
  };

  if (productIds) {
    payload.product_ids = productIds;
    if (productIds[0]) {
      payload.product = getProductMeta(productIds[0]).name;
    }
  }

  if (!payload.name) {
    return { ok: false, message: "Nome é obrigatório." };
  }
  if (!payload.capability_id && !needIds?.length) {
    return {
      ok: false,
      message: "Capacidade ou necessidade são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("features").upsert(payload);
  if (error) return { ok: false, message: error.message };

  if (needIds) {
    await supabase.from("feature_needs").delete().eq("feature_id", id);
    if (needIds.length) {
      await supabase.from("feature_needs").upsert(
        needIds.map((user_need_id) => ({ feature_id: id, user_need_id })),
      );
    }
  }

  if (journeyIds) {
    await supabase.from("feature_journeys").delete().eq("feature_id", id);
    if (journeyIds.length) {
      await supabase.from("feature_journeys").upsert(
        journeyIds.map((journey_id) => ({ feature_id: id, journey_id })),
      );
    }
  }

  revalidateAll();
  return { ok: true, message: "Funcionalidade salva.", id };
}

/** Cria funcionalidade + capacidade (se preciso) + status por canal a partir do modal. */
/** Cria funcionalidade + capacidade (se preciso) + status por canal a partir do modal. */
export async function createFeatureFromModal(input: {
  audienceIds: string[];
  momentId: string;
  journeyId: string;
  needId: string;
  priority: string;
  featureName: string;
  featureDesc?: string;
  /** @deprecated Prefer channelSelections (canais por público). */
  channelIds?: string[];
  /** Pares público × canal selecionados no modal. */
  channelSelections?: { audienceId: string; channelId: string }[];
  productIds?: string[];
  /** @deprecated Prefer productIds. */
  productId?: string;
}): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const audienceIds = input.audienceIds.filter(Boolean);
  const momentId = String(input.momentId ?? "").trim();
  const journeyId = String(input.journeyId ?? "").trim();
  const needId = String(input.needId ?? "").trim();
  const featureName = String(input.featureName ?? "").trim();
  const featureDesc = String(input.featureDesc ?? "").trim();
  const priority = String(input.priority ?? "MEDIUM").trim() || "MEDIUM";
  const productIds = (input.productIds ?? [])
    .map((p) => parseProductId(String(p).trim()))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const resolvedProducts =
    productIds.length > 0
      ? productIds
      : [resolveProductId(input.productId)];

  const channelSelections =
    input.channelSelections && input.channelSelections.length > 0
      ? input.channelSelections.filter((s) => s.audienceId && s.channelId)
      : audienceIds.flatMap((audienceId) =>
          (input.channelIds ?? [])
            .filter(Boolean)
            .map((channelId) => ({ audienceId, channelId })),
        );

  if (
    !audienceIds.length ||
    !momentId ||
    !needId ||
    !featureName ||
    !channelSelections.length ||
    !resolvedProducts.length
  ) {
    return {
      ok: false,
      message:
        "Público, momento, necessidade, nome da funcionalidade, produto e ao menos um canal são obrigatórios.",
    };
  }

  const supabase = await createClient();

  const { data: need, error: needError } = await supabase
    .from("user_needs")
    .select("id, name, journey_id, product_id")
    .eq("id", needId)
    .eq("active", true)
    .maybeSingle();

  if (needError || !need) {
    return { ok: false, message: "Necessidade não encontrada." };
  }

  const resolvedJourneyId =
    journeyId || String(need.journey_id ?? "").trim() || "";

  // Reuse an existing capability for this need, or create one (compatibilidade).
  const { data: existingCaps } = await supabase
    .from("capabilities")
    .select("id, name")
    .eq("user_need_id", needId)
    .eq("active", true)
    .limit(1);

  let capabilityId = existingCaps?.[0]?.id as string | undefined;
  if (!capabilityId) {
    capabilityId = newId("cap");
    const { error: capError } = await supabase.from("capabilities").insert({
      id: capabilityId,
      user_need_id: needId,
      name: `Capacidade · ${need.name}`,
      description: `Capacidade gerada automaticamente para a necessidade "${need.name}".`,
      active: true,
    });
    if (capError) return { ok: false, message: capError.message };
  }

  const featureId = newId("feat");
  const { error: featureError } = await supabase.from("features").insert({
    id: featureId,
    capability_id: capabilityId,
    name: featureName,
    description: featureDesc,
    product: getProductMeta(resolvedProducts[0]).name,
    product_ids: resolvedProducts,
    priority,
    owner: "",
    ux_owner: "",
    cx_owner: "",
    product_owner: "",
    active: true,
    is_demo: false,
  });
  if (featureError) return { ok: false, message: featureError.message };

  // M2M Feature ↔ Need / Journey (ignora se tabelas ainda não existirem).
  await supabase.from("feature_needs").upsert({
    feature_id: featureId,
    user_need_id: needId,
  });
  if (resolvedJourneyId) {
    await supabase.from("feature_journeys").upsert({
      feature_id: featureId,
      journey_id: resolvedJourneyId,
    });
  }

  for (const { audienceId, channelId } of channelSelections) {
    const { data: existingCc } = await supabase
      .from("channel_contexts")
      .select("id")
      .eq("audience_id", audienceId)
      .eq("moment_id", momentId)
      .eq("channel_id", channelId)
      .eq("active", true)
      .limit(1);

    let channelContextId = existingCc?.[0]?.id as string | undefined;
    if (!channelContextId) {
      channelContextId = newId("cc");
      const { error: ccError } = await supabase.from("channel_contexts").insert({
        id: channelContextId,
        audience_id: audienceId,
        moment_id: momentId,
        channel_id: channelId,
        temporal_status: "CURRENT",
        notes: "",
        active: true,
      });
      if (ccError) return { ok: false, message: ccError.message };
    }

    for (const productId of resolvedProducts) {
      const fccId = newId("fcc");
      const { error: fccError } = await supabase
        .from("feature_channel_contexts")
        .upsert(
          {
            id: fccId,
            feature_id: featureId,
            product_id: productId,
            channel_context_id: channelContextId,
            status: "NO_DEADLINE",
            experience: "NOT_EVALUATED",
            phase: "BACKLOG",
            start_date: null,
            expected_date: null,
            launch_date: null,
            responsible: "",
            notes: "",
            active: true,
          },
          { onConflict: "feature_id,product_id,channel_context_id" },
        );
      if (fccError) return { ok: false, message: fccError.message };
    }
  }

  revalidateAll();
  return {
    ok: true,
    message: "Funcionalidade criada com sucesso.",
    id: featureId,
  };
}

/**
 * Amplia a aplicabilidade de uma necessidade para novos públicos
 * (mantém os já vinculados).
 */
export async function extendNeedAudiences(input: {
  needId: string;
  audienceIds: string[];
}): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const needId = String(input.needId ?? "").trim();
  const extra = Array.from(
    new Set(
      (input.audienceIds ?? []).map((id) => String(id).trim()).filter(Boolean),
    ),
  );

  if (!needId || extra.length === 0) {
    return { ok: false, message: "Necessidade e públicos são obrigatórios." };
  }

  const supabase = await createClient();
  const { data: need, error } = await supabase
    .from("user_needs")
    .select("id, name, audience_ids")
    .eq("id", needId)
    .eq("active", true)
    .maybeSingle();

  if (error || !need) {
    return { ok: false, message: "Necessidade não encontrada." };
  }

  const current = Array.isArray(need.audience_ids)
    ? need.audience_ids.map(String)
    : [];
  const merged = Array.from(new Set([...current, ...extra]));

  const { error: updateError } = await supabase
    .from("user_needs")
    .update({ audience_ids: merged })
    .eq("id", needId);

  if (updateError) return { ok: false, message: updateError.message };

  revalidateAll();
  return {
    ok: true,
    message: `Necessidade "${need.name}" vinculada aos públicos selecionados.`,
    id: needId,
  };
}

/**
 * Vincula uma funcionalidade já existente a uma necessidade e etapa da jornada,
 * sem criar um novo registro de feature.
 */
export async function linkExistingFeatureToJourney(input: {
  featureId: string;
  needId: string;
  journeyId?: string;
}): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const featureId = String(input.featureId ?? "").trim();
  const needId = String(input.needId ?? "").trim();
  const journeyId = String(input.journeyId ?? "").trim();

  if (!featureId || !needId) {
    return {
      ok: false,
      message: "Funcionalidade e necessidade são obrigatórias.",
    };
  }

  const supabase = await createClient();

  const { data: feature, error: featureError } = await supabase
    .from("features")
    .select("id, name")
    .eq("id", featureId)
    .eq("active", true)
    .maybeSingle();

  if (featureError || !feature) {
    return { ok: false, message: "Funcionalidade não encontrada." };
  }

  const { data: need, error: needError } = await supabase
    .from("user_needs")
    .select("id, name, journey_id")
    .eq("id", needId)
    .eq("active", true)
    .maybeSingle();

  if (needError || !need) {
    return { ok: false, message: "Necessidade não encontrada." };
  }

  const resolvedJourneyId =
    journeyId || String(need.journey_id ?? "").trim() || "";

  const { data: existingLink } = await supabase
    .from("feature_needs")
    .select("feature_id")
    .eq("feature_id", featureId)
    .eq("user_need_id", needId)
    .maybeSingle();

  if (existingLink) {
    if (resolvedJourneyId) {
      await supabase.from("feature_journeys").upsert({
        feature_id: featureId,
        journey_id: resolvedJourneyId,
      });
    }
    revalidateAll();
    return {
      ok: true,
      message: "Esta funcionalidade já estava vinculada a esta necessidade.",
      id: featureId,
    };
  }

  const { error: needLinkError } = await supabase.from("feature_needs").upsert({
    feature_id: featureId,
    user_need_id: needId,
  });
  if (needLinkError) return { ok: false, message: needLinkError.message };

  if (resolvedJourneyId) {
    const { error: journeyLinkError } = await supabase
      .from("feature_journeys")
      .upsert({
        feature_id: featureId,
        journey_id: resolvedJourneyId,
      });
    if (journeyLinkError) {
      return { ok: false, message: journeyLinkError.message };
    }
  }

  revalidateAll();
  return {
    ok: true,
    message: `Funcionalidade "${feature.name}" adicionada à etapa da jornada.`,
    id: featureId,
  };
}

export async function duplicateFeature(featureId: string): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("features")
    .select("*")
    .eq("id", featureId)
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Funcionalidade não encontrada." };
  }

  const id = newId("feat");
  const { error: insertError } = await supabase.from("features").insert({
    ...data,
    id,
    name: `${data.name} (cópia)`,
    is_demo: true,
    created_at: undefined,
    updated_at: undefined,
  });

  if (insertError) return { ok: false, message: insertError.message };
  revalidateAll();
  return { ok: true, message: "Funcionalidade duplicada.", id };
}

export async function upsertJourney(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("jrn");
  const payload = {
    id,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    active: formData.get("active") !== "false",
  };

  if (!payload.name) return { ok: false, message: "Nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("journeys").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Jornada salva.", id };
}

export async function upsertJourneyAudienceStage(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("jas");
  const journeyStageId =
    String(formData.get("journey_stage_id") ?? "").trim() || null;
  const payload: Record<string, unknown> = {
    id,
    audience_id: String(formData.get("audience_id") ?? "").trim(),
    journey_id: String(formData.get("journey_id") ?? "").trim(),
    display_name: String(formData.get("display_name") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    moment_id: String(formData.get("moment_id") ?? "").trim(),
    active: formData.get("active") !== "false",
    updated_at: new Date().toISOString(),
  };
  if (journeyStageId) payload.journey_stage_id = journeyStageId;

  if (
    !payload.audience_id ||
    !payload.journey_id ||
    !payload.display_name ||
    !payload.moment_id
  ) {
    return {
      ok: false,
      message: "Público, jornada, nome exibido e momento são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("journey_audience_stages")
    .upsert(payload);
  if (error) {
    if (/journey_stage_id/i.test(error.message) && "journey_stage_id" in payload) {
      const legacy = { ...payload };
      delete legacy.journey_stage_id;
      const retry = await supabase.from("journey_audience_stages").upsert(legacy);
      if (retry.error) return { ok: false, message: retry.error.message };
    } else {
      return { ok: false, message: error.message };
    }
  }
  revalidateAll();
  return { ok: true, message: "Etapa da jornada salva.", id };
}

export async function archiveJourneyAudienceStage(
  id: string,
): Promise<ActionResult> {
  return archiveRecord("journey_audience_stages", id);
}

/**
 * Garante que a etapa da jornada exista para os públicos informados,
 * copiando nome/ordem/momento do template (etapa de origem).
 */
export async function ensureJourneyStagesForAudiences(input: {
  journeyId: string;
  momentId: string;
  displayName: string;
  sortOrder: number;
  audienceIds: string[];
}): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const journeyId = String(input.journeyId ?? "").trim();
  const momentId = String(input.momentId ?? "").trim();
  const displayName = String(input.displayName ?? "").trim();
  const sortOrder = Number(input.sortOrder ?? 0);
  const audienceIds = Array.from(
    new Set(
      (input.audienceIds ?? []).map((id) => String(id).trim()).filter(Boolean),
    ),
  );

  if (!journeyId || !momentId || !displayName || audienceIds.length === 0) {
    return {
      ok: false,
      message: "Jornada, momento, nome da etapa e públicos são obrigatórios.",
    };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("journey_audience_stages")
    .select("id, audience_id")
    .eq("journey_id", journeyId)
    .eq("moment_id", momentId)
    .eq("active", true)
    .in("audience_id", audienceIds);

  if (existingError) {
    return { ok: false, message: existingError.message };
  }

  const already = new Set((existing ?? []).map((r) => String(r.audience_id)));
  const missing = audienceIds.filter((id) => !already.has(id));

  if (missing.length === 0) {
    return { ok: true, message: "Etapas já existiam para os públicos." };
  }

  const rows = missing.map((audienceId) => ({
    id: newId("jas"),
    audience_id: audienceId,
    journey_id: journeyId,
    display_name: displayName,
    sort_order: sortOrder,
    moment_id: momentId,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  // Unique canônico é (audience_id, journey_stage_id). Aqui só criamos ausentes.
  const { error } = await supabase.from("journey_audience_stages").insert(rows);

  if (error) return { ok: false, message: error.message };

  revalidateAll();
  return {
    ok: true,
    message: `Etapa adicionada para ${missing.length} público${missing.length === 1 ? "" : "s"}.`,
  };
}

export async function upsertUserNeed(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("need");
  const journeyId = String(formData.get("journey_id") ?? "");
  const journeyStageId =
    String(formData.get("journey_stage_id") ?? "").trim() || null;
  const productIdsRaw = String(formData.get("product_ids") ?? "").trim();
  const productIds = productIdsRaw
    ? productIdsRaw
        .split(",")
        .map((p) => parseProductId(p.trim()))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : formData.get("product_id")
      ? [resolveProductId(formData.get("product_id") as string)]
      : [];

  const audienceIdsRaw = String(formData.get("audience_ids") ?? "").trim();
  const audienceIds = audienceIdsRaw
    ? audienceIdsRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const payload = {
    id,
    journey_id: journeyId,
    journey_stage_id: journeyStageId,
    product_id: productIds[0] ?? resolveProductId(null),
    product_ids: productIds,
    audience_ids: audienceIds,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    measurement: String(formData.get("measurement") ?? "").trim(),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    active: formData.get("active") !== "false",
  };

  if (!payload.name || !payload.journey_id) {
    return { ok: false, message: "Nome e jornada são obrigatórios." };
  }

  if (audienceIds.length === 0) {
    return {
      ok: false,
      message: "Selecione ao menos um público.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_needs").upsert(payload);
  if (error) return { ok: false, message: error.message };

  const evidenceTitle = String(formData.get("evidence_title") ?? "").trim();
  if (evidenceTitle) {
    const evidenceId =
      String(formData.get("evidence_id") ?? "").trim() || newId("ev");
    const { error: evidenceError } = await supabase.from("evidences").upsert({
      id: evidenceId,
      feature_id: null,
      user_need_id: id,
      feature_evolution_id: null,
      title: evidenceTitle,
      type: String(formData.get("evidence_type") ?? "OTHER"),
      description: String(formData.get("evidence_description") ?? "").trim(),
      link: String(formData.get("evidence_link") ?? "").trim() || null,
      evidence_date:
        (formData.get("evidence_date") as string) ||
        new Date().toISOString().slice(0, 10),
      responsible: String(formData.get("evidence_responsible") ?? "").trim(),
      active: true,
    });
    if (evidenceError) {
      return {
        ok: false,
        message: `Necessidade salva, mas a evidência falhou: ${evidenceError.message}`,
        id,
      };
    }
  }

  revalidateAll();
  return { ok: true, message: "Necessidade salva.", id };
}

export async function upsertCapability(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("cap");
  const payload = {
    id,
    user_need_id: String(formData.get("user_need_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    active: formData.get("active") !== "false",
  };

  if (!payload.name || !payload.user_need_id) {
    return { ok: false, message: "Nome e necessidade são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("capabilities").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Capacidade salva.", id };
}

export async function upsertChannel(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("ch");
  const payload = {
    id,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    type: String(formData.get("type") ?? "digital").trim(),
    active: formData.get("active") !== "false",
  };

  if (!payload.name) return { ok: false, message: "Nome é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("channels").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Canal salvo.", id };
}

export async function upsertChannelContext(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("cc");
  const payload = {
    id,
    audience_id: String(formData.get("audience_id") ?? ""),
    moment_id: String(formData.get("moment_id") ?? ""),
    channel_id: String(formData.get("channel_id") ?? ""),
    temporal_status: String(formData.get("temporal_status") ?? "CURRENT"),
    notes: String(formData.get("notes") ?? "").trim(),
    active: formData.get("active") !== "false",
  };

  if (!payload.audience_id || !payload.moment_id || !payload.channel_id) {
    return {
      ok: false,
      message: "Público, momento e canal são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("channel_contexts").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Contexto de canal salvo.", id };
}

export async function upsertFeatureChannelContext(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const existingId = String(formData.get("id") ?? "").trim();
  const featureId = String(formData.get("feature_id") ?? "");
  const channelContextId = String(formData.get("channel_context_id") ?? "");
  const phase =
    String(formData.get("phase") ?? "").trim() ||
    String(formData.get("etapa") ?? "").trim() ||
    "BACKLOG";
  const expectedDate = (formData.get("expected_date") as string) || null;
  const statusRaw = String(formData.get("status") ?? "").trim();
  const { deriveDeadlineStatus, normalizeDeadlineStatus } = await import(
    "@/lib/labels"
  );
  const status =
    statusRaw === "ON_TRACK" ||
    statusRaw === "DELAYED" ||
    statusRaw === "NO_DEADLINE"
      ? normalizeDeadlineStatus(statusRaw)
      : deriveDeadlineStatus(expectedDate, phase);

  const figmaUrl = String(formData.get("figma_url") ?? "").trim() || null;
  let experienceImageUrl =
    String(formData.get("experience_image_url") ?? "").trim() || null;
  const removeImage = formData.get("remove_experience_image") === "true";
  const imageFile = formData.get("experience_image");
  const requireExperiencePair =
    formData.get("require_experience_pair") === "true";
  /** Só atualiza ticket quando o form envia o campo (não apaga em edits parciais). */
  const ticketNumberUpdate = formData.has("ticket_number")
    ? {
        ticket_number:
          String(formData.get("ticket_number") ?? "").trim() || null,
      }
    : {};

  if (requireExperiencePair && !figmaUrl) {
    return { ok: false, message: "Informe o link do Figma." };
  }

  if (!featureId || !channelContextId) {
    return {
      ok: false,
      message: "Funcionalidade e contexto de canal são obrigatórios.",
    };
  }

  const productIdsRaw = String(formData.get("product_ids") ?? "").trim();
  const productIds = productIdsRaw
    ? productIdsRaw
        .split(",")
        .map((p) => parseProductId(p.trim()))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : formData.has("product_id")
      ? [resolveProductId(formData.get("product_id") as string)]
      : [resolveProductId(null)];

  if (productIds.length === 0) {
    return { ok: false, message: "Selecione ao menos um produto." };
  }

  const supabase = await createClient();

  const baseFields = {
    feature_id: featureId,
    channel_context_id: channelContextId,
    status,
    experience: String(formData.get("experience") ?? "NOT_EVALUATED"),
    phase,
    start_date: (formData.get("start_date") as string) || null,
    expected_date: expectedDate,
    launch_date: (formData.get("launch_date") as string) || null,
    responsible: String(formData.get("responsible") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    figma_url: figmaUrl,
    experience_url:
      String(formData.get("experience_url") ?? "").trim() || null,
    active: formData.get("active") !== "false",
    ...ticketNumberUpdate,
  };

  // Edição: aplica nos produtos selecionados deste canal (atualiza existentes e cria faltantes).
  if (existingId) {
    if (removeImage && !imageFile) {
      if (experienceImageUrl) {
        const { removeEvidenceFile, isStoragePath } = await import(
          "@/lib/evidence-files"
        );
        if (isStoragePath(experienceImageUrl)) {
          await removeEvidenceFile(experienceImageUrl);
        }
      }
      experienceImageUrl = null;
    }

    if (imageFile instanceof File && imageFile.size > 0) {
      const { uploadExperienceImage, isStoragePath } = await import(
        "@/lib/evidence-files"
      );
      const uploaded = await uploadExperienceImage({
        featureId,
        fccId: existingId,
        file: imageFile,
        previousPath:
          experienceImageUrl && isStoragePath(experienceImageUrl)
            ? experienceImageUrl
            : null,
      });
      if (!uploaded.ok) return { ok: false, message: uploaded.message };
      experienceImageUrl = uploaded.filePath;
    }

    if (requireExperiencePair && !experienceImageUrl) {
      return {
        ok: false,
        message: "Envie também um screenshot da experiência junto com o Figma.",
      };
    }

    const { data: existingRows, error: listError } = await supabase
      .from("feature_channel_contexts")
      .select("id, product_id")
      .eq("feature_id", featureId)
      .eq("channel_context_id", channelContextId)
      .eq("active", true);

    if (listError) return { ok: false, message: listError.message };

    const byProduct = new Map(
      (existingRows ?? []).map((row) => [
        String(row.product_id),
        String(row.id),
      ]),
    );

    let primaryId = existingId;
    for (const productId of productIds) {
      const fccId = byProduct.get(productId) ?? newId("fcc");
      const { error } = await supabase.from("feature_channel_contexts").upsert({
        id: fccId,
        ...baseFields,
        product_id: productId,
        experience_image_url: experienceImageUrl,
      });
      if (error) return { ok: false, message: error.message };
      if (productId === productIds[0]) primaryId = fccId;
    }

    revalidateAll();
    return {
      ok: true,
      message:
        productIds.length > 1
          ? `Implementação salva em ${productIds.length} produtos.`
          : "Status por contexto salvo.",
      id: primaryId,
    };
  }

  // Criação: um registro por produto selecionado.
  const createdIds: string[] = [];
  for (const productId of productIds) {
    const fccId = newId("fcc");
    const { error } = await supabase.from("feature_channel_contexts").upsert({
      id: fccId,
      ...baseFields,
      product_id: productId,
      experience_image_url: null,
    });
    if (error) return { ok: false, message: error.message };
    createdIds.push(fccId);
  }

  revalidateAll();
  return {
    ok: true,
    message:
      createdIds.length > 1
        ? `Implementação criada em ${createdIds.length} produtos.`
        : "Status por contexto salvo.",
    id: createdIds[0],
  };
}

/**
 * Salva avaliação da experiência em um ou mais FCCs do mesmo card de canal.
 * Inclui resultado de pesquisa (arquivo + data) e flag de necessidade de evolução.
 */
export async function upsertChannelEvaluation(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const featureId = String(formData.get("feature_id") ?? "").trim();
  const fccIdsRaw = String(formData.get("fcc_ids") ?? "").trim();
  const fccIds = fccIdsRaw
    ? fccIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : [String(formData.get("id") ?? "").trim()].filter(Boolean);

  if (!featureId || fccIds.length === 0) {
    return {
      ok: false,
      message: "Funcionalidade e implementação são obrigatórias.",
    };
  }

  const experience = String(formData.get("experience") ?? "NOT_EVALUATED").trim() ||
    "NOT_EVALUATED";
  const evaluationNotes = String(formData.get("evaluation_notes") ?? "").trim();
  const researchDate =
    String(formData.get("research_date") ?? "").trim() || null;
  const needsEvolution = formData.get("needs_evolution") === "true";
  const removeResearch = formData.get("remove_research_file") === "true";
  const researchFile = formData.get("research_file");

  const supabase = await createClient();
  const primaryId = fccIds[0];

  const { data: existing, error: existingError } = await supabase
    .from("feature_channel_contexts")
    .select(
      "id, research_file_path, research_file_name, research_file_mime, research_file_size",
    )
    .eq("id", primaryId)
    .maybeSingle();

  if (existingError || !existing) {
    return { ok: false, message: "Implementação não encontrada." };
  }

  let researchFilePath = (existing.research_file_path as string | null) ?? null;
  let researchFileName = (existing.research_file_name as string | null) ?? null;
  let researchFileMime = (existing.research_file_mime as string | null) ?? null;
  let researchFileSize =
    (existing.research_file_size as number | null) ?? null;

  if (removeResearch && !(researchFile instanceof File && researchFile.size > 0)) {
    if (researchFilePath) {
      const { removeEvidenceFile, isStoragePath } = await import(
        "@/lib/evidence-files"
      );
      if (isStoragePath(researchFilePath)) {
        await removeEvidenceFile(researchFilePath);
      }
    }
    researchFilePath = null;
    researchFileName = null;
    researchFileMime = null;
    researchFileSize = null;
  }

  if (researchFile instanceof File && researchFile.size > 0) {
    const { uploadResearchFile, isStoragePath } = await import(
      "@/lib/evidence-files"
    );
    const uploaded = await uploadResearchFile({
      featureId,
      fccId: primaryId,
      file: researchFile,
      previousPath:
        researchFilePath && isStoragePath(researchFilePath)
          ? researchFilePath
          : null,
    });
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    researchFilePath = uploaded.filePath;
    researchFileName = uploaded.fileName;
    researchFileMime = uploaded.fileMime;
    researchFileSize = uploaded.fileSize;
  }

  const patch = {
    experience,
    evaluation_notes: evaluationNotes,
    research_date: researchDate,
    research_file_path: researchFilePath,
    research_file_name: researchFileName,
    research_file_mime: researchFileMime,
    research_file_size: researchFileSize,
    needs_evolution: needsEvolution,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("feature_channel_contexts")
    .update(patch)
    .in("id", fccIds);

  if (error) return { ok: false, message: error.message };

  revalidateAll();
  return { ok: true, message: "Avaliação salva.", id: primaryId };
}

/**
 * Avaliações UX/CX (histórico): Área → Tipo → Método → Resultado → Evidências.
 * Escopo: Feature × ChannelContext (card de canal).
 */
export async function upsertFeatureChannelEvaluation(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const existingId = String(formData.get("id") ?? "").trim();
  const featureId = String(formData.get("feature_id") ?? "").trim();
  const channelContextId = String(
    formData.get("channel_context_id") ?? "",
  ).trim();
  const featureChannelContextId =
    String(formData.get("feature_channel_context_id") ?? "").trim() || null;

  if (!featureId || !channelContextId) {
    return {
      ok: false,
      message: "Funcionalidade e contexto de canal são obrigatórios.",
    };
  }

  const area = String(formData.get("area") ?? "").trim();
  const studyType = String(formData.get("study_type") ?? "CUSTOM").trim();
  const methodCode = String(formData.get("method_code") ?? "").trim();
  const methodCustomName = String(
    formData.get("method_custom_name") ?? "",
  ).trim();

  if (!area || !methodCode) {
    return { ok: false, message: "Área e método são obrigatórios." };
  }

  if (
    (methodCode === "CUSTOM" || methodCode === "OTHER") &&
    !methodCustomName
  ) {
    return {
      ok: false,
      message: "Informe o nome da avaliação personalizada.",
    };
  }

  const status = String(formData.get("status") ?? "PLANNED").trim() || "PLANNED";
  const name =
    String(formData.get("name") ?? "").trim() ||
    methodCustomName ||
    methodCode;
  const objective = String(formData.get("objective") ?? "").trim();
  const evaluatedAt =
    String(formData.get("evaluated_at") ?? "").trim() || null;
  const responsible = String(formData.get("responsible") ?? "").trim();
  const audienceSegment = String(
    formData.get("audience_segment") ?? "",
  ).trim();
  const findings = String(formData.get("findings") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const researchUrl =
    String(formData.get("research_url") ?? "").trim() || null;
  const reportUrl = String(formData.get("report_url") ?? "").trim() || null;
  const figmaUrl = String(formData.get("figma_url") ?? "").trim() || null;
  const needsEvolution = formData.get("needs_evolution") === "true";

  let results: Record<string, unknown> = {};
  const resultsRaw = String(formData.get("results_json") ?? "").trim();
  if (resultsRaw) {
    try {
      results = JSON.parse(resultsRaw) as Record<string, unknown>;
    } catch {
      return { ok: false, message: "Resultados inválidos." };
    }
  } else {
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("result_")) continue;
      const fieldKey = key.slice("result_".length);
      const raw = String(value).trim();
      if (!raw) continue;
      const asNum = Number(raw);
      results[fieldKey] = Number.isFinite(asNum) && raw !== "" ? asNum : raw;
    }
  }

  const supabase = await createClient();
  const id = existingId || newId("fceval");

  let evidenceFilePath =
    String(formData.get("evidence_file_path") ?? "").trim() || null;
  let evidenceFileName =
    String(formData.get("evidence_file_name") ?? "").trim() || null;
  let evidenceFileMime =
    String(formData.get("evidence_file_mime") ?? "").trim() || null;
  let evidenceFileSize: number | null = formData.has("evidence_file_size")
    ? Number(formData.get("evidence_file_size")) || null
    : null;

  if (existingId) {
    const { data: current } = await supabase
      .from("feature_channel_evaluations")
      .select(
        "evidence_file_path, evidence_file_name, evidence_file_mime, evidence_file_size",
      )
      .eq("id", existingId)
      .maybeSingle();
    if (current) {
      evidenceFilePath = (current.evidence_file_path as string) ?? evidenceFilePath;
      evidenceFileName = (current.evidence_file_name as string) ?? evidenceFileName;
      evidenceFileMime = (current.evidence_file_mime as string) ?? evidenceFileMime;
      evidenceFileSize =
        (current.evidence_file_size as number | null) ?? evidenceFileSize;
    }
  }

  const removeEvidence = formData.get("remove_research_file") === "true";
  const evidenceFile = formData.get("research_file");

  if (removeEvidence && !(evidenceFile instanceof File && evidenceFile.size > 0)) {
    if (evidenceFilePath) {
      const { removeEvidenceFile, isStoragePath } = await import(
        "@/lib/evidence-files"
      );
      if (isStoragePath(evidenceFilePath)) {
        await removeEvidenceFile(evidenceFilePath);
      }
    }
    evidenceFilePath = null;
    evidenceFileName = null;
    evidenceFileMime = null;
    evidenceFileSize = null;
  }

  if (evidenceFile instanceof File && evidenceFile.size > 0) {
    const { uploadResearchFile, isStoragePath } = await import(
      "@/lib/evidence-files"
    );
    const fccId = featureChannelContextId || "shared";
    const uploaded = await uploadResearchFile({
      featureId,
      fccId,
      file: evidenceFile,
      previousPath:
        evidenceFilePath && isStoragePath(evidenceFilePath)
          ? evidenceFilePath
          : null,
    });
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    evidenceFilePath = uploaded.filePath;
    evidenceFileName = uploaded.fileName;
    evidenceFileMime = uploaded.fileMime;
    evidenceFileSize = uploaded.fileSize;
  }

  const payload = {
    id,
    feature_id: featureId,
    channel_context_id: channelContextId,
    feature_channel_context_id: featureChannelContextId,
    area,
    study_type: studyType,
    method_code: methodCode,
    method_custom_name: methodCustomName,
    name,
    objective,
    status,
    evaluated_at: evaluatedAt,
    responsible,
    audience_segment: audienceSegment,
    results,
    findings,
    notes,
    research_url: researchUrl,
    report_url: reportUrl,
    figma_url: figmaUrl,
    evidence_file_path: evidenceFilePath,
    evidence_file_name: evidenceFileName,
    evidence_file_mime: evidenceFileMime,
    evidence_file_size: evidenceFileSize,
    needs_evolution: needsEvolution,
    active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("feature_channel_evaluations")
    .upsert(payload);
  if (error) return { ok: false, message: error.message };

  // Fase 8B: materializar anexos elegíveis como Evidence EVALUATION (append-only).
  try {
    const {
      buildMaterializedEvidenceDrafts,
      filterDraftsNotYetMaterialized,
    } = await import("@/lib/evidence");
    const evaluationForMat = {
      id,
      featureId,
      channelContextId,
      featureChannelContextId,
      area: area as import("@/types").FeatureChannelEvaluation["area"],
      studyType: studyType as import("@/types").FeatureChannelEvaluation["studyType"],
      methodCode,
      methodCustomName,
      name,
      objective,
      status: status as import("@/types").FeatureChannelEvaluation["status"],
      evaluatedAt,
      responsible,
      audienceSegment,
      results,
      findings,
      notes,
      researchUrl,
      reportUrl,
      figmaUrl,
      evidenceFilePath,
      evidenceFileName,
      evidenceFileMime,
      evidenceFileSize,
      needsEvolution,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const drafts = buildMaterializedEvidenceDrafts(evaluationForMat);
    if (drafts.length > 0) {
      const { data: existingRows } = await supabase
        .from("evidences")
        .select(
          "id, feature_id, evaluation_id, owner_type, owner_id, link, file_path, file_name",
        )
        .eq("active", true)
        .or(`evaluation_id.eq.${id},owner_id.eq.${id}`);
      const existing = (existingRows ?? []).map((row) => ({
        id: String(row.id),
        featureId: (row.feature_id as string | null) ?? null,
        evaluationId: (row.evaluation_id as string | null) ?? null,
        ownerType: row.owner_type as "FEATURE" | "EVALUATION" | undefined,
        ownerId: (row.owner_id as string | undefined) ?? undefined,
        userNeedId: null,
        featureEvolutionId: null,
        title: "",
        type: "OTHER" as const,
        description: "",
        link: (row.link as string | null) ?? null,
        date: "",
        responsible: "",
        filePath: (row.file_path as string | null) ?? null,
        fileName: (row.file_name as string | null) ?? null,
        fileMime: null,
        fileSize: null,
      }));
      const toInsert = filterDraftsNotYetMaterialized(drafts, existing);
      for (const draft of toInsert) {
        const row = {
          id: draft.id,
          feature_id: draft.featureId,
          user_need_id: null,
          feature_evolution_id: null,
          evaluation_id: draft.evaluationId,
          owner_type: draft.ownerType,
          owner_id: draft.ownerId,
          title: draft.title,
          type: draft.type,
          description: draft.description,
          link: draft.link,
          evidence_date: draft.date,
          responsible: draft.responsible,
          active: true,
          file_path: draft.filePath,
          file_name: draft.fileName,
          file_mime: draft.fileMime,
          file_size: draft.fileSize,
        };
        const { error: matError } = await supabase.from("evidences").upsert(row);
        if (matError && /evaluation_id|owner_type|owner_id/i.test(matError.message)) {
          const legacy = { ...row } as Record<string, unknown>;
          delete legacy.evaluation_id;
          delete legacy.owner_type;
          delete legacy.owner_id;
          await supabase.from("evidences").upsert(legacy);
        }
      }
    }
  } catch {
    // Materialização não deve falhar o save da Evaluation.
  }

  revalidateAll();
  return {
    ok: true,
    message: existingId ? "Avaliação atualizada." : "Avaliação adicionada.",
    id,
  };
}

export async function upsertIssue(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("iss");
  // Fase 8A: NÃO escrever evidence_ids (legado DEPRECATED).
  // Fonte de verdade: Evidence.owner FEATURE | EVALUATION.
  // Storage físico: tabela `gaps` (Issue / Gap₂) — sem rename nesta fase.
  const payload = {
    id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    type: String(formData.get("type") ?? "EXPERIENCE"),
    audience_id: String(formData.get("audience_id") ?? ""),
    moment_id: String(formData.get("moment_id") ?? ""),
    journey_id: String(formData.get("journey_id") ?? ""),
    user_need_id: String(formData.get("user_need_id") ?? ""),
    product_id: (formData.get("product_id") as string) || null,
    feature_id: (formData.get("feature_id") as string) || null,
    current_channel_id: (formData.get("current_channel_id") as string) || null,
    future_channel_id: (formData.get("future_channel_id") as string) || null,
    impact: String(formData.get("impact") ?? "MEDIUM"),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    responsible: String(formData.get("responsible") ?? "").trim(),
    status: String(formData.get("status") ?? "OPEN"),
    action_plan: String(formData.get("action_plan") ?? "").trim(),
    is_demo: formData.get("is_demo") === "true",
    active: formData.get("active") !== "false",
  };

  if (
    !payload.title ||
    !payload.audience_id ||
    !payload.moment_id ||
    !payload.journey_id ||
    !payload.user_need_id
  ) {
    return {
      ok: false,
      message: "Título, público, momento, jornada e necessidade são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gaps").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Problema salvo.", id };
}

/** @deprecated Fase 12 — preferir `upsertIssue`. Persiste na tabela `gaps`. */
export async function upsertGap(formData: FormData): Promise<ActionResult> {
  return upsertIssue(formData);
}

export async function upsertEvidence(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const { normalizeEvidenceOwnerFields } = await import("@/lib/evidence");

  const id = (formData.get("id") as string) || newId("ev");
  const normalized = normalizeEvidenceOwnerFields({
    ownerType: String(formData.get("owner_type") ?? "").trim() || null,
    ownerId: String(formData.get("owner_id") ?? "").trim() || null,
    evaluationId: String(formData.get("evaluation_id") ?? "").trim() || null,
    featureId: String(formData.get("feature_id") ?? "").trim() || null,
  });

  let featureId = normalized.featureId;
  const evaluationId = normalized.evaluationId;
  const ownerType = normalized.ownerType;
  const ownerId = normalized.ownerId ?? null;

  const userNeedId = String(formData.get("user_need_id") ?? "").trim() || null;
  const featureEvolutionId =
    String(formData.get("feature_evolution_id") ?? "").trim() || null;
  const removeFile = formData.get("remove_file") === "true";
  const file = formData.get("file");

  const supabase = await createClient();

  // EVALUATION: garantir feature_id denormalizado a partir da avaliação.
  if (ownerType === "EVALUATION" && evaluationId && !featureId) {
    const { data: evaluation } = await supabase
      .from("feature_channel_evaluations")
      .select("feature_id")
      .eq("id", evaluationId)
      .maybeSingle();
    featureId = (evaluation?.feature_id as string | undefined) ?? null;
  }

  if (!featureId && !userNeedId && !featureEvolutionId && !evaluationId) {
    return {
      ok: false,
      message:
        "Vincule a evidência a uma funcionalidade ou a uma avaliação (owner canônico).",
    };
  }

  if (ownerType === "FEATURE" && !featureId) {
    return {
      ok: false,
      message: "ownerType FEATURE exige feature_id / owner_id.",
    };
  }
  if (ownerType === "EVALUATION" && !evaluationId) {
    return {
      ok: false,
      message: "ownerType EVALUATION exige evaluation_id / owner_id.",
    };
  }

  const { data: existing } = await supabase
    .from("evidences")
    .select("file_path, file_name, file_mime, file_size")
    .eq("id", id)
    .maybeSingle();

  let filePath = (existing?.file_path as string | null) ?? null;
  let fileName = (existing?.file_name as string | null) ?? null;
  let fileMime = (existing?.file_mime as string | null) ?? null;
  let fileSize = (existing?.file_size as number | null) ?? null;

  if (removeFile && filePath) {
    const { removeEvidenceFile } = await import("@/lib/evidence-files");
    await removeEvidenceFile(filePath);
    filePath = null;
    fileName = null;
    fileMime = null;
    fileSize = null;
  }

  if (file instanceof File && file.size > 0) {
    const { uploadEvidenceFile } = await import("@/lib/evidence-files");
    const uploaded = await uploadEvidenceFile({
      featureId: featureId ?? userNeedId ?? featureEvolutionId ?? evaluationId ?? "shared",
      evidenceId: id,
      file,
      previousPath: filePath,
    });
    if (!uploaded.ok) return { ok: false, message: uploaded.message };
    filePath = uploaded.filePath;
    fileName = uploaded.fileName;
    fileMime = uploaded.fileMime;
    fileSize = uploaded.fileSize;
  }

  const payload: Record<string, unknown> = {
    id,
    feature_id: featureId,
    user_need_id: userNeedId,
    feature_evolution_id: featureEvolutionId,
    evaluation_id: evaluationId,
    owner_type: ownerType ?? (evaluationId ? "EVALUATION" : featureId ? "FEATURE" : null),
    owner_id: ownerId ?? evaluationId ?? featureId,
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "OTHER"),
    description: String(formData.get("description") ?? "").trim(),
    link: (formData.get("link") as string) || null,
    evidence_date:
      (formData.get("evidence_date") as string) ||
      (formData.get("date") as string) ||
      new Date().toISOString().slice(0, 10),
    responsible: String(formData.get("responsible") ?? "").trim(),
    active: formData.get("active") !== "false",
    file_path: filePath,
    file_name: fileName,
    file_mime: fileMime,
    file_size: fileSize,
  };

  if (!payload.title) {
    return { ok: false, message: "Título é obrigatório." };
  }

  const { error } = await supabase.from("evidences").upsert(payload);
  if (error) {
    // Colunas owner/evaluation ainda não migradas: retry legado.
    if (/evaluation_id|owner_type|owner_id/i.test(error.message)) {
      const legacyPayload = {
        id,
        feature_id: featureId,
        user_need_id: userNeedId,
        feature_evolution_id: featureEvolutionId,
        title: payload.title,
        type: payload.type,
        description: payload.description,
        link: payload.link,
        evidence_date: payload.evidence_date,
        responsible: payload.responsible,
        active: payload.active,
        file_path: filePath,
        file_name: fileName,
        file_mime: fileMime,
        file_size: fileSize,
      };
      const retry = await supabase.from("evidences").upsert(legacyPayload);
      if (retry.error) return { ok: false, message: retry.error.message };
    } else {
      return { ok: false, message: error.message };
    }
  }

  revalidateAll();
  return { ok: true, message: "Evidência salva.", id };
}

/**
 * @deprecated Fase 6 — não criar novos RoadmapItems.
 * Fonte de verdade: FeatureChannelContext (fase da implementação) + FeatureEvolution.
 * Esta action recusa criação/edição e orienta o consumidor correto.
 * Mantida apenas para não quebrar imports legados até remoção da tabela.
 */
export async function upsertRoadmapItem(
  formData: FormData,
): Promise<ActionResult> {
  void formData;
  const blocked = await guardMutation();
  if (blocked) return blocked;

  return {
    ok: false,
    message:
      "RoadmapItem está deprecado. Edite a implementação (FeatureChannelContext) ou crie uma FeatureEvolution em /roadmap ou na Ficha.",
  };
}

function slugPhaseCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export async function upsertRoadmapPhase(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("rph");
  const name = String(formData.get("name") ?? "").trim();
  const codeRaw = String(formData.get("code") ?? "").trim();
  const code = (codeRaw || slugPhaseCode(name)).toUpperCase();
  const payload = {
    id,
    code,
    name,
    symbol: String(formData.get("symbol") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    active: formData.get("active") !== "false",
    updated_at: new Date().toISOString(),
  };

  if (!payload.name || !payload.code) {
    return { ok: false, message: "Nome da fase é obrigatório." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("roadmap_phases").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Fase salva.", id };
}

export async function archiveRoadmapPhase(
  id: string,
  code: string,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const supabase = await createClient();

  const { count: fccCount, error: fccError } = await supabase
    .from("feature_channel_contexts")
    .select("id", { count: "exact", head: true })
    .eq("phase", code)
    .eq("active", true);

  if (fccError) return { ok: false, message: fccError.message };
  if ((fccCount ?? 0) > 0) {
    return {
      ok: false,
      message: `Não é possível excluir: ${fccCount} implementação(ões) ainda usam esta fase. Mova-as antes.`,
    };
  }

  // Legado: ainda pode haver roadmap_items históricos com a fase.
  const { count, error: countError } = await supabase
    .from("roadmap_items")
    .select("id", { count: "exact", head: true })
    .eq("phase", code)
    .eq("active", true);

  if (countError) return { ok: false, message: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Não é possível excluir: ${count} item(ns) legados de planejamento ainda usam esta fase.`,
    };
  }

  return archiveRecord("roadmap_phases", id);
}

export async function upsertAudience(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("aud");
  const payload = {
    id,
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    active: formData.get("active") !== "false",
  };

  if (!payload.name || !payload.code) {
    return { ok: false, message: "Código e nome são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("audiences").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Público salvo.", id };
}

export async function upsertMoment(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("mom");
  const payload = {
    id,
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    active: formData.get("active") !== "false",
  };

  if (!payload.name || !payload.code) {
    return { ok: false, message: "Código e nome são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("moments").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Momento salvo.", id };
}

export async function upsertFeatureEvolution(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const existingId = String(formData.get("id") ?? "").trim();
  const rawPhase = String(formData.get("phase") ?? "").trim() || "BACKLOG";
  const rawStatus = String(formData.get("status") ?? "").trim() || "IN_PROGRESS";
  const { status: resolvedStatus, phase: resolvedPhase } =
    reconcileEvolutionStatusPhase(rawStatus, rawPhase);

  const originRaw = String(formData.get("origin") ?? "").trim();
  const originProvided = Boolean(originRaw);
  /** Create: default MANUAL. Edit without field: omit (não sobrescreve legado). */
  const origin = originProvided
    ? normalizeEvolutionOrigin(originRaw)
    : "MANUAL";

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "MEDIUM");
  const startDate = (formData.get("start_date") as string) || null;
  const expectedDate = (formData.get("expected_date") as string) || null;
  const completedDate =
    resolvedStatus === "DONE" || resolvedPhase === "DONE"
      ? (formData.get("completed_date") as string) ||
        new Date().toISOString().slice(0, 10)
      : (formData.get("completed_date") as string) || null;
  const responsible = String(formData.get("responsible") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const measurement = String(formData.get("measurement") ?? "").trim();
  const active = formData.get("active") !== "false";

  const fccIdsRaw = String(formData.get("fcc_ids") ?? "").trim();
  const singleFcc = String(
    formData.get("feature_channel_context_id") ?? "",
  ).trim();
  const fccIds = Array.from(
    new Set(
      (fccIdsRaw
        ? fccIdsRaw.split(",").map((id) => id.trim())
        : [singleFcc]
      ).filter(Boolean),
    ),
  );

  if (!title || fccIds.length === 0) {
    return {
      ok: false,
      message:
        "Implementação (canal/produto) e título da evolução são obrigatórios.",
    };
  }

  const supabase = await createClient();

  // Edição de uma evolução existente: mantém um único vínculo.
  if (existingId) {
    const payload: Record<string, unknown> = {
      id: existingId,
      feature_channel_context_id: fccIds[0],
      title,
      description,
      phase: resolvedPhase,
      status: resolvedStatus,
      priority,
      start_date: startDate,
      expected_date: expectedDate,
      completed_date: completedDate,
      responsible,
      notes,
      measurement,
      active,
      updated_at: new Date().toISOString(),
    };
    if (originProvided) payload.origin = origin;

    const { error } = await supabase.from("feature_evolutions").upsert(payload);
    if (error) {
      // Coluna origin ainda não migrada: retry sem origin (compatibilidade).
      if (/origin/i.test(error.message) && "origin" in payload) {
        const legacyPayload = { ...payload };
        delete legacyPayload.origin;
        const retry = await supabase
          .from("feature_evolutions")
          .upsert(legacyPayload);
        if (retry.error) return { ok: false, message: retry.error.message };
      } else {
        return { ok: false, message: error.message };
      }
    }

    const evidenceTitle = String(formData.get("evidence_title") ?? "").trim();
    if (evidenceTitle) {
      const evidenceId =
        String(formData.get("evidence_id") ?? "").trim() || newId("ev");
      let featureId: string | null =
        String(formData.get("feature_id") ?? "").trim() || null;
      if (!featureId) {
        const { data: fcc } = await supabase
          .from("feature_channel_contexts")
          .select("feature_id")
          .eq("id", payload.feature_channel_context_id)
          .maybeSingle();
        featureId = (fcc?.feature_id as string | undefined) ?? null;
      }
      const { error: evidenceError } = await supabase.from("evidences").upsert({
        id: evidenceId,
        feature_id: featureId,
        user_need_id: null,
        feature_evolution_id: existingId,
        owner_type: featureId ? "FEATURE" : null,
        owner_id: featureId,
        evaluation_id: null,
        title: evidenceTitle,
        type: String(formData.get("evidence_type") ?? "OTHER"),
        description: String(formData.get("evidence_description") ?? "").trim(),
        link: String(formData.get("evidence_link") ?? "").trim() || null,
        evidence_date:
          (formData.get("evidence_date") as string) ||
          new Date().toISOString().slice(0, 10),
        responsible: String(formData.get("evidence_responsible") ?? "").trim(),
        active: true,
      });
      if (evidenceError) {
        if (/owner_type|owner_id|evaluation_id/i.test(evidenceError.message)) {
          const retry = await supabase.from("evidences").upsert({
            id: evidenceId,
            feature_id: featureId,
            user_need_id: null,
            feature_evolution_id: existingId,
            title: evidenceTitle,
            type: String(formData.get("evidence_type") ?? "OTHER"),
            description: String(
              formData.get("evidence_description") ?? "",
            ).trim(),
            link: String(formData.get("evidence_link") ?? "").trim() || null,
            evidence_date:
              (formData.get("evidence_date") as string) ||
              new Date().toISOString().slice(0, 10),
            responsible: String(
              formData.get("evidence_responsible") ?? "",
            ).trim(),
            active: true,
          });
          if (retry.error) {
            return {
              ok: false,
              message: `Evolução salva, mas a evidência falhou: ${retry.error.message}`,
              id: existingId,
            };
          }
        } else {
          return {
            ok: false,
            message: `Evolução salva, mas a evidência falhou: ${evidenceError.message}`,
            id: existingId,
          };
        }
      }
    }

    revalidateAll();
    return { ok: true, message: "Evolução salva.", id: existingId };
  }

  // Criação: uma evolução por produto/implementação selecionada.
  const createdIds: string[] = [];
  for (const fccId of fccIds) {
    const id = newId("fevo");
    const payload = {
      id,
      feature_channel_context_id: fccId,
      title,
      description,
      phase: resolvedPhase,
      status: resolvedStatus,
      origin,
      priority,
      start_date: startDate,
      expected_date: expectedDate,
      completed_date: completedDate,
      responsible,
      notes,
      measurement,
      active,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("feature_evolutions").upsert(payload);
    if (error) {
      if (/origin/i.test(error.message)) {
        const legacyPayload = { ...payload };
        delete (legacyPayload as { origin?: string }).origin;
        const retry = await supabase
          .from("feature_evolutions")
          .upsert(legacyPayload);
        if (retry.error) return { ok: false, message: retry.error.message };
      } else {
        return { ok: false, message: error.message };
      }
    }
    createdIds.push(id);
  }

  const evidenceTitle = String(formData.get("evidence_title") ?? "").trim();
  if (evidenceTitle && createdIds[0]) {
    const evidenceId =
      String(formData.get("evidence_id") ?? "").trim() || newId("ev");
    let featureId: string | null =
      String(formData.get("feature_id") ?? "").trim() || null;
    if (!featureId) {
      const { data: fcc } = await supabase
        .from("feature_channel_contexts")
        .select("feature_id")
        .eq("id", fccIds[0])
        .maybeSingle();
      featureId = (fcc?.feature_id as string | undefined) ?? null;
    }
    const { error: evidenceError } = await supabase.from("evidences").upsert({
      id: evidenceId,
      feature_id: featureId,
      user_need_id: null,
      feature_evolution_id: createdIds[0],
      owner_type: featureId ? "FEATURE" : null,
      owner_id: featureId,
      evaluation_id: null,
      title: evidenceTitle,
      type: String(formData.get("evidence_type") ?? "OTHER"),
      description: String(formData.get("evidence_description") ?? "").trim(),
      link: String(formData.get("evidence_link") ?? "").trim() || null,
      evidence_date:
        (formData.get("evidence_date") as string) ||
        new Date().toISOString().slice(0, 10),
      responsible: String(formData.get("evidence_responsible") ?? "").trim(),
      active: true,
    });
    if (evidenceError) {
      if (/owner_type|owner_id|evaluation_id/i.test(evidenceError.message)) {
        const retry = await supabase.from("evidences").upsert({
          id: evidenceId,
          feature_id: featureId,
          user_need_id: null,
          feature_evolution_id: createdIds[0],
          title: evidenceTitle,
          type: String(formData.get("evidence_type") ?? "OTHER"),
          description: String(
            formData.get("evidence_description") ?? "",
          ).trim(),
          link: String(formData.get("evidence_link") ?? "").trim() || null,
          evidence_date:
            (formData.get("evidence_date") as string) ||
            new Date().toISOString().slice(0, 10),
          responsible: String(
            formData.get("evidence_responsible") ?? "",
          ).trim(),
          active: true,
        });
        if (retry.error) {
          return {
            ok: false,
            message: `Evolução salva, mas a evidência falhou: ${retry.error.message}`,
            id: createdIds[0],
          };
        }
      } else {
        return {
          ok: false,
          message: `Evolução salva, mas a evidência falhou: ${evidenceError.message}`,
          id: createdIds[0],
        };
      }
    }
  }

  revalidateAll();
  return {
    ok: true,
    message:
      createdIds.length > 1
        ? `Evolução criada em ${createdIds.length} produtos.`
        : "Evolução salva.",
    id: createdIds[0],
  };
}

export async function archiveFeatureEvolution(
  id: string,
): Promise<ActionResult> {
  return archiveRecord("feature_evolutions", id);
}
