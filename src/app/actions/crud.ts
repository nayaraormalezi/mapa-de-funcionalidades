"use server";

import { revalidatePath } from "next/cache";
import { requireCanEdit } from "@/lib/auth";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import { invalidateDatabaseCache } from "@/services/db";

export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
};

async function guardMutation(): Promise<ActionResult | null> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message: "Supabase não está habilitado. Configure as variáveis de ambiente.",
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
  const payload = {
    id,
    capability_id: String(formData.get("capability_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    product: String(formData.get("product") ?? "Consórcio").trim(),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    owner: String(formData.get("owner") ?? "").trim(),
    ux_owner: String(formData.get("ux_owner") ?? "").trim(),
    cx_owner: String(formData.get("cx_owner") ?? "").trim(),
    product_owner: String(formData.get("product_owner") ?? "").trim(),
    active: formData.get("active") !== "false",
    is_demo: formData.get("is_demo") === "true",
  };

  if (!payload.name || !payload.capability_id) {
    return { ok: false, message: "Nome e capacidade são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("features").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Funcionalidade salva.", id };
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
  const payload = {
    id,
    audience_id: String(formData.get("audience_id") ?? "").trim(),
    journey_id: String(formData.get("journey_id") ?? "").trim(),
    display_name: String(formData.get("display_name") ?? "").trim(),
    sort_order: Number(formData.get("sort_order") ?? 0),
    moment_id: String(formData.get("moment_id") ?? "").trim(),
    active: formData.get("active") !== "false",
    updated_at: new Date().toISOString(),
  };

  if (
    !payload.audience_id ||
    !payload.journey_id ||
    !payload.display_name ||
    !payload.moment_id
  ) {
    return {
      ok: false,
      message: "Público, etapa, nome exibido e momento são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("journey_audience_stages")
    .upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Etapa da jornada salva.", id };
}

export async function archiveJourneyAudienceStage(
  id: string,
): Promise<ActionResult> {
  return archiveRecord("journey_audience_stages", id);
}

export async function upsertUserNeed(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("need");
  const payload = {
    id,
    journey_id: String(formData.get("journey_id") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priority: String(formData.get("priority") ?? "MEDIUM"),
    active: formData.get("active") !== "false",
  };

  if (!payload.name || !payload.journey_id) {
    return { ok: false, message: "Nome e jornada são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_needs").upsert(payload);
  if (error) return { ok: false, message: error.message };
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

  const id = (formData.get("id") as string) || newId("fcc");
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
  const payload = {
    id,
    feature_id: String(formData.get("feature_id") ?? ""),
    channel_context_id: String(formData.get("channel_context_id") ?? ""),
    status,
    experience: String(formData.get("experience") ?? "NOT_EVALUATED"),
    phase,
    start_date: (formData.get("start_date") as string) || null,
    expected_date: expectedDate,
    launch_date: (formData.get("launch_date") as string) || null,
    responsible: String(formData.get("responsible") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    active: formData.get("active") !== "false",
  };

  if (!payload.feature_id || !payload.channel_context_id) {
    return {
      ok: false,
      message: "Funcionalidade e contexto de canal são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_channel_contexts")
    .upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Status por contexto salvo.", id };
}

export async function upsertGap(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("gap");
  const payload = {
    id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    type: String(formData.get("type") ?? "COVERAGE"),
    audience_id: String(formData.get("audience_id") ?? ""),
    moment_id: String(formData.get("moment_id") ?? ""),
    journey_id: String(formData.get("journey_id") ?? ""),
    user_need_id: String(formData.get("user_need_id") ?? ""),
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
  return { ok: true, message: "Gap salvo.", id };
}

export async function upsertEvidence(formData: FormData): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const id = (formData.get("id") as string) || newId("ev");
  const featureId = String(formData.get("feature_id") ?? "");
  const removeFile = formData.get("remove_file") === "true";
  const file = formData.get("file");

  const supabase = await createClient();
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
      featureId,
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

  const payload = {
    id,
    feature_id: featureId,
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "OTHER"),
    description: String(formData.get("description") ?? "").trim(),
    link: (formData.get("link") as string) || null,
    evidence_date:
      (formData.get("evidence_date") as string) ||
      new Date().toISOString().slice(0, 10),
    responsible: String(formData.get("responsible") ?? "").trim(),
    active: formData.get("active") !== "false",
    file_path: filePath,
    file_name: fileName,
    file_mime: fileMime,
    file_size: fileSize,
  };

  if (!payload.title || !payload.feature_id) {
    return { ok: false, message: "Título e funcionalidade são obrigatórios." };
  }

  const { error } = await supabase.from("evidences").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Evidência salva.", id };
}

export async function upsertRoadmapItem(
  formData: FormData,
): Promise<ActionResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const existingId = (formData.get("id") as string) || "";
  const phase = String(formData.get("phase") ?? "").trim() || "BACKLOG";
  const featureId = String(formData.get("feature_id") ?? "");
  const startDate = (formData.get("start_date") as string) || null;
  const expectedDate = (formData.get("expected_date") as string) || null;
  const actualDate = (formData.get("actual_date") as string) || null;
  const responsible = String(formData.get("responsible") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!featureId) {
    return { ok: false, message: "Funcionalidade é obrigatória." };
  }

  const audienceIds = formData
    .getAll("audience_ids")
    .map(String)
    .filter(Boolean);
  const momentId = String(formData.get("moment_id") ?? "").trim();
  const channelIds = formData.getAll("channel_ids").map(String).filter(Boolean);
  const legacyContextId =
    (formData.get("channel_context_id") as string)?.trim() || null;

  const hasAnyContextDim =
    audienceIds.length > 0 || Boolean(momentId) || channelIds.length > 0;
  const hasCompleteContext =
    audienceIds.length > 0 && Boolean(momentId) && channelIds.length > 0;

  if (hasAnyContextDim && !hasCompleteContext) {
    return {
      ok: false,
      message:
        "Para vincular contexto, selecione público, momento e ao menos um canal.",
    };
  }

  const supabase = await createClient();

  let contextIds: (string | null)[] = [];

  if (hasCompleteContext) {
    const { data, error: ctxError } = await supabase
      .from("channel_contexts")
      .select("id, audience_id, moment_id, channel_id, temporal_status")
      .eq("active", true)
      .eq("moment_id", momentId)
      .in("audience_id", audienceIds)
      .in("channel_id", channelIds);

    if (ctxError) return { ok: false, message: ctxError.message };

    const preferred = new Map<string, string>();
    for (const row of data ?? []) {
      const key = `${row.audience_id}|${row.moment_id}|${row.channel_id}`;
      const current = preferred.get(key);
      if (!current || row.temporal_status === "CURRENT") {
        preferred.set(key, row.id);
      }
    }
    contextIds = Array.from(preferred.values());
    if (contextIds.length === 0) {
      return {
        ok: false,
        message:
          "Nenhum contexto de canal encontrado para o público, momento e canais selecionados.",
      };
    }
  } else if (legacyContextId) {
    contextIds = [legacyContextId];
  } else {
    contextIds = [null];
  }

  if (existingId) {
    const payload = {
      id: existingId,
      feature_id: featureId,
      channel_context_id: contextIds[0] ?? null,
      phase,
      start_date: startDate,
      expected_date: expectedDate,
      actual_date: actualDate,
      responsible,
      notes,
      active: formData.get("active") !== "false",
    };
    const { error } = await supabase.from("roadmap_items").upsert(payload);
    if (error) return { ok: false, message: error.message };

    if (payload.channel_context_id) {
      await supabase
        .from("feature_channel_contexts")
        .update({ phase })
        .eq("feature_id", featureId)
        .eq("channel_context_id", payload.channel_context_id);
    }

    revalidateAll();
    return { ok: true, message: "Item de roadmap salvo.", id: existingId };
  }

  const rows = contextIds.map((channelContextId) => ({
    id: newId("rm"),
    feature_id: featureId,
    channel_context_id: channelContextId,
    phase,
    start_date: startDate,
    expected_date: expectedDate,
    actual_date: actualDate,
    responsible,
    notes,
    active: true,
  }));

  const { error } = await supabase.from("roadmap_items").upsert(rows);
  if (error) return { ok: false, message: error.message };

  for (const row of rows) {
    if (!row.channel_context_id) continue;
    await supabase
      .from("feature_channel_contexts")
      .update({ phase })
      .eq("feature_id", featureId)
      .eq("channel_context_id", row.channel_context_id);
  }

  revalidateAll();
  return {
    ok: true,
    message:
      rows.length > 1
        ? `${rows.length} itens de roadmap salvos.`
        : "Item de roadmap salvo.",
    id: rows[0]?.id,
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
  const { count, error: countError } = await supabase
    .from("roadmap_items")
    .select("id", { count: "exact", head: true })
    .eq("phase", code)
    .eq("active", true);

  if (countError) return { ok: false, message: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: `Não é possível excluir: ${count} item(ns) ainda usam esta fase. Mova-os antes.`,
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

  const id = (formData.get("id") as string) || newId("fevo");
  const phase = String(formData.get("phase") ?? "").trim() || "BACKLOG";
  let status = String(formData.get("status") ?? "").trim() || "IN_PROGRESS";
  if (phase === "DONE") status = "DONE";
  if (status === "DONE" && phase !== "DONE") {
    // allow status DONE with phase DONE
  }
  const payload = {
    id,
    feature_channel_context_id: String(
      formData.get("feature_channel_context_id") ?? "",
    ),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    phase: phase === "DONE" || status === "DONE" ? "DONE" : phase,
    status: phase === "DONE" ? "DONE" : status,
    priority: String(formData.get("priority") ?? "MEDIUM"),
    start_date: (formData.get("start_date") as string) || null,
    expected_date: (formData.get("expected_date") as string) || null,
    completed_date:
      status === "DONE"
        ? (formData.get("completed_date") as string) ||
          new Date().toISOString().slice(0, 10)
        : (formData.get("completed_date") as string) || null,
    responsible: String(formData.get("responsible") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    active: formData.get("active") !== "false",
    updated_at: new Date().toISOString(),
  };

  if (!payload.feature_channel_context_id || !payload.title) {
    return {
      ok: false,
      message: "Implementação (contexto) e título da evolução são obrigatórios.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feature_evolutions").upsert(payload);
  if (error) return { ok: false, message: error.message };
  revalidateAll();
  return { ok: true, message: "Evolução salva.", id };
}

export async function archiveFeatureEvolution(
  id: string,
): Promise<ActionResult> {
  return archiveRecord("feature_evolutions", id);
}
