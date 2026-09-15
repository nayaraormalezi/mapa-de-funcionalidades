import { demoDatabase } from "@/database/seed/demo-data";
import { mapDatabase } from "@/lib/supabase/mappers";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import type { DemoDatabase } from "@/types";
import type {
  AudienceRow,
  CapabilityRow,
  ChannelContextRow,
  ChannelRow,
  EvidenceRow,
  FeatureChannelContextRow,
  FeatureRow,
  GapRow,
  JourneyAudienceStageRow,
  JourneyMomentRow,
  JourneyRow,
  MomentRow,
  RoadmapItemRow,
  RoadmapPhaseRow,
  UserNeedRow,
} from "@/lib/supabase/mappers";

let cache: { data: DemoDatabase; at: number } | null = null;
const CACHE_MS = 5_000;

export function invalidateDatabaseCache() {
  cache = null;
}

export async function getDatabase(): Promise<DemoDatabase> {
  if (!isSupabaseEnabled()) {
    return demoDatabase;
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  try {
    const data = await fetchFromSupabase();
    cache = { data, at: Date.now() };
    return data;
  } catch (error) {
    console.error("Supabase unavailable, falling back to DEMO seed:", error);
    return demoDatabase;
  }
}

async function fetchFromSupabase(): Promise<DemoDatabase> {
  const supabase = await createClient();

  const [
    audiences,
    moments,
    journeys,
    journeyMoments,
    journeyAudienceStages,
    userNeeds,
    capabilities,
    features,
    channels,
    channelContexts,
    featureChannelContexts,
    evidences,
    roadmapPhases,
    roadmapItems,
    gaps,
  ] = await Promise.all([
    supabase.from("audiences").select("*").eq("active", true).order("name"),
    supabase.from("moments").select("*").eq("active", true).order("name"),
    supabase.from("journeys").select("*").eq("active", true).order("sort_order"),
    supabase.from("journey_moments").select("*"),
    supabase
      .from("journey_audience_stages")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("user_needs").select("*").eq("active", true).order("name"),
    supabase.from("capabilities").select("*").eq("active", true).order("name"),
    supabase.from("features").select("*").eq("active", true).order("name"),
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
    supabase.from("roadmap_items").select("*").eq("active", true),
    supabase.from("gaps").select("*").eq("active", true).order("priority"),
  ]);

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
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors.map((e) => e!.message).join("; "));
  }

  return mapDatabase({
    audiences: (audiences.data ?? []) as AudienceRow[],
    moments: (moments.data ?? []) as MomentRow[],
    journeys: (journeys.data ?? []) as JourneyRow[],
    journeyMoments: (journeyMoments.data ?? []) as JourneyMomentRow[],
    journeyAudienceStages: (journeyAudienceStages.data ??
      []) as JourneyAudienceStageRow[],
    userNeeds: (userNeeds.data ?? []) as UserNeedRow[],
    capabilities: (capabilities.data ?? []) as CapabilityRow[],
    features: (features.data ?? []) as FeatureRow[],
    channels: (channels.data ?? []) as ChannelRow[],
    channelContexts: (channelContexts.data ?? []) as ChannelContextRow[],
    featureChannelContexts: (featureChannelContexts.data ??
      []) as FeatureChannelContextRow[],
    evidences: (evidences.data ?? []) as EvidenceRow[],
    roadmapPhases: (roadmapPhases.data ?? []) as RoadmapPhaseRow[],
    roadmapItems: (roadmapItems.data ?? []) as RoadmapItemRow[],
    gaps: (gaps.data ?? []) as GapRow[],
  });
}
