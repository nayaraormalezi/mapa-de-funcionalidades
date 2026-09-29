import { demoDatabase } from "@/database/seed/demo-data";
import {
  DatabaseLoadError,
  getDataMode,
  sanitizeErrorMessage,
  type DataMode,
} from "@/lib/data-mode";
import { mapDatabase } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import type { DemoDatabase } from "@/types";
import type {
  AudienceRow,
  CapabilityRow,
  ChannelContextRow,
  ChannelRow,
  EvidenceRow,
  FeatureChannelContextRow,
  FeatureJourneyRow,
  FeatureNeedRow,
  FeatureRow,
  FeatureUserProfileRow,
  GapRow,
  FeatureEvolutionRow,
  FeatureChannelEvaluationRow,
  JourneyAudienceStageRow,
  JourneyMomentRow,
  JourneyRow,
  JourneyStageRow,
  MomentRow,
  ProductRow,
  RoadmapItemRow,
  RoadmapPhaseRow,
  UserNeedRow,
} from "@/lib/supabase/mappers";

let cache: { data: DemoDatabase; mode: DataMode; at: number } | null = null;
const CACHE_MS = 5_000;

export function invalidateDatabaseCache() {
  cache = null;
}

/** Modo de dados ativo (LIVE | DEMO). Preferir em vez de inferir pela presença de dados. */
export { getDataMode, type DataMode } from "@/lib/data-mode";

/**
 * Fonte única de dados do PRISMA.
 *
 * DEMO (explícito via env): retorna demo-data.
 * LIVE: lê Supabase. Em falha, lança DatabaseLoadError — nunca faz fallback para DEMO.
 */
export async function getDatabase(): Promise<DemoDatabase> {
  const mode = getDataMode();

  if (mode === "DEMO") {
    return demoDatabase;
  }

  if (cache && cache.mode === "LIVE" && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const data = await fetchFromSupabase();
    cache = { data, mode: "LIVE", at: Date.now() };
    return data;
  } catch (error) {
    cache = null;
    console.error("[PRISMA LIVE] Supabase unavailable — no DEMO fallback:", error);
    throw new DatabaseLoadError(
      [
        "Não foi possível carregar os dados. Verifique a conexão com o Supabase e tente novamente.",
        sanitizeErrorMessage(error)
          ? `Detalhe: ${sanitizeErrorMessage(error)}`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      error,
    );
  }
}

function isMissingRelation(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  return /relation .* does not exist|Could not find the table|column .* does not exist/i.test(
    error.message,
  );
}

async function fetchFromSupabase(): Promise<DemoDatabase> {
  const supabase = await createClient();

  const [
    products,
    audiences,
    moments,
    journeys,
    journeyMoments,
    journeyStages,
    journeyAudienceStages,
    userNeeds,
    capabilities,
    features,
    featureNeeds,
    featureJourneys,
    featureUserProfiles,
    channels,
    channelContexts,
    featureChannelContexts,
    evidences,
    roadmapPhases,
    roadmapItems,
    featureEvolutions,
    featureChannelEvaluations,
    gaps,
  ] = await Promise.all([
    supabase.from("products").select("*").eq("active", true).order("sort_order"),
    supabase.from("audiences").select("*").eq("active", true).order("name"),
    supabase.from("moments").select("*").eq("active", true).order("name"),
    supabase.from("journeys").select("*").eq("active", true).order("sort_order"),
    supabase.from("journey_moments").select("*"),
    supabase
      .from("journey_stages")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("journey_audience_stages")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("user_needs").select("*").eq("active", true).order("name"),
    supabase.from("capabilities").select("*").eq("active", true).order("name"),
    supabase.from("features").select("*").eq("active", true).order("name"),
    supabase.from("feature_needs").select("*"),
    supabase.from("feature_journeys").select("*"),
    supabase
      .from("feature_user_profiles")
      .select(
        // Hint explícito: há 2 FKs para profiles (user_id e created_by).
        "id, feature_id, user_id, profile_name, created_by, created_at, updated_at, profiles!feature_user_profiles_user_id_fkey(full_name, email)",
      )
      .order("created_at", { ascending: true }),
    supabase.from("channels").select("*").eq("active", true).order("name"),
    supabase.from("channel_contexts").select("*").eq("active", true),
    supabase.from("feature_channel_contexts").select("*").eq("active", true),
    supabase
      .from("evidences")
      .select("*")
      .eq("active", true)
      .order("evidence_date", { ascending: false }),
    supabase
      .from("roadmap_phases")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("roadmap_items").select("*").eq("active", true), // legado Fase 6
    supabase.from("feature_evolutions").select("*").eq("active", true),
    supabase
      .from("feature_channel_evaluations")
      .select("*")
      .eq("active", true)
      .order("evaluated_at", { ascending: false }),
    supabase.from("gaps").select("*").eq("active", true).order("priority"),
  ]);

  const softErrors = [
    products.error && !isMissingRelation(products.error) ? products.error : null,
    journeyStages.error && !isMissingRelation(journeyStages.error)
      ? journeyStages.error
      : null,
    featureNeeds.error && !isMissingRelation(featureNeeds.error)
      ? featureNeeds.error
      : null,
    featureJourneys.error && !isMissingRelation(featureJourneys.error)
      ? featureJourneys.error
      : null,
    // feature_user_profiles: tabela nova/opcional — nunca derruba o carregamento.
    featureEvolutions.error &&
    !isMissingRelation(featureEvolutions.error) &&
    !/relation .*feature_evolutions.* does not exist|Could not find the table/i.test(
      featureEvolutions.error.message,
    )
      ? featureEvolutions.error
      : null,
  ].filter(Boolean);

  const errors = [
    audiences.error,
    moments.error,
    journeys.error,
    journeyMoments.error,
    journeyAudienceStages.error,
    userNeeds.error,
    capabilities.error,
    features.error,
    channels.error,
    channelContexts.error,
    featureChannelContexts.error,
    evidences.error,
    roadmapPhases.error,
    roadmapItems.error,
    gaps.error,
    ...softErrors,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors.map((e) => e!.message).join("; "));
  }

  return mapDatabase({
    products: (isMissingRelation(products.error)
      ? []
      : (products.data ?? [])) as ProductRow[],
    audiences: (audiences.data ?? []) as AudienceRow[],
    moments: (moments.data ?? []) as MomentRow[],
    journeys: (journeys.data ?? []) as JourneyRow[],
    journeyMoments: (journeyMoments.data ?? []) as JourneyMomentRow[],
    journeyStages: (isMissingRelation(journeyStages.error)
      ? []
      : (journeyStages.data ?? [])) as JourneyStageRow[],
    journeyAudienceStages: (journeyAudienceStages.data ??
      []) as JourneyAudienceStageRow[],
    userNeeds: (userNeeds.data ?? []) as UserNeedRow[],
    capabilities: (capabilities.data ?? []) as CapabilityRow[],
    features: (features.data ?? []) as FeatureRow[],
    featureNeeds: (isMissingRelation(featureNeeds.error)
      ? []
      : (featureNeeds.data ?? [])) as FeatureNeedRow[],
    featureJourneys: (isMissingRelation(featureJourneys.error)
      ? []
      : (featureJourneys.data ?? [])) as FeatureJourneyRow[],
    featureUserProfiles: (featureUserProfiles.error
      ? []
      : (featureUserProfiles.data ?? [])) as FeatureUserProfileRow[],
    channels: (channels.data ?? []) as ChannelRow[],
    channelContexts: (channelContexts.data ?? []) as ChannelContextRow[],
    featureChannelContexts: (featureChannelContexts.data ??
      []) as FeatureChannelContextRow[],
    evidences: (evidences.data ?? []) as EvidenceRow[],
    roadmapPhases: (roadmapPhases.data ?? []) as RoadmapPhaseRow[],
    roadmapItems: (roadmapItems.data ?? []) as RoadmapItemRow[],
    featureEvolutions: (featureEvolutions.error
      ? []
      : (featureEvolutions.data ?? [])) as FeatureEvolutionRow[],
    featureChannelEvaluations: (featureChannelEvaluations.error
      ? []
      : (featureChannelEvaluations.data ??
        [])) as FeatureChannelEvaluationRow[],
    gaps: (gaps.data ?? []) as GapRow[],
  });
}
