import type { DemoDatabase } from "@/types";
import {
  deriveDeadlineStatus,
  normalizeDeadlineStatus,
  normalizeFeatureStage,
} from "@/lib/labels";
import { catalogAsProducts, isProductId, resolveProductId } from "@/lib/products";

/** Snake_case DB row shapes (Supabase). */
export type AudienceRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
};

export type MomentRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
};

export type JourneyRow = {
  id: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type JourneyMomentRow = {
  journey_id: string;
  moment_id: string;
};

export type JourneyAudienceStageRow = {
  id: string;
  audience_id: string;
  journey_id: string;
  display_name: string;
  sort_order: number;
  moment_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserNeedRow = {
  id: string;
  journey_id: string;
  name: string;
  description: string;
  priority: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CapabilityRow = {
  id: string;
  user_need_id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FeatureRow = {
  id: string;
  capability_id: string;
  name: string;
  description: string;
  product: string;
  priority: string;
  owner: string;
  ux_owner: string;
  cx_owner: string;
  product_owner: string;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type ChannelRow = {
  id: string;
  name: string;
  description: string;
  type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChannelContextRow = {
  id: string;
  audience_id: string;
  moment_id: string;
  channel_id: string;
  temporal_status: string;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FeatureChannelContextRow = {
  id: string;
  feature_id: string;
  product_id?: string | null;
  channel_context_id: string;
  status: string;
  experience: string;
  phase: string;
  start_date: string | null;
  expected_date: string | null;
  launch_date: string | null;
  responsible: string;
  notes: string;
  active: boolean;
  updated_at: string;
};

export type EvidenceRow = {
  id: string;
  feature_id: string;
  title: string;
  type: string;
  description: string;
  link: string | null;
  evidence_date: string;
  responsible: string;
  active: boolean;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
};

export type RoadmapPhaseRow = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RoadmapItemRow = {
  id: string;
  feature_id: string;
  channel_context_id: string | null;
  phase: string;
  start_date: string | null;
  expected_date: string | null;
  actual_date: string | null;
  responsible: string;
  notes: string;
  active: boolean;
};

export type GapRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  audience_id: string;
  moment_id: string;
  journey_id: string;
  user_need_id: string;
  feature_id: string | null;
  product_id?: string | null;
  current_channel_id: string | null;
  future_channel_id: string | null;
  impact: string;
  priority: string;
  evidence_ids: string[];
  responsible: string;
  status: string;
  action_plan: string;
  is_demo: boolean;
  active: boolean;
};

export type FeatureEvolutionRow = {
  id: string;
  feature_channel_context_id: string;
  title: string;
  description: string;
  phase: string;
  status: string;
  priority: string;
  start_date: string | null;
  expected_date: string | null;
  completed_date: string | null;
  responsible: string;
  notes: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapDatabase(rows: {
  products?: ProductRow[];
  audiences: AudienceRow[];
  moments: MomentRow[];
  journeys: JourneyRow[];
  journeyMoments: JourneyMomentRow[];
  journeyAudienceStages?: JourneyAudienceStageRow[];
  userNeeds: UserNeedRow[];
  capabilities: CapabilityRow[];
  features: FeatureRow[];
  channels: ChannelRow[];
  channelContexts: ChannelContextRow[];
  featureChannelContexts: FeatureChannelContextRow[];
  evidences: EvidenceRow[];
  roadmapPhases?: RoadmapPhaseRow[];
  roadmapItems: RoadmapItemRow[];
  featureEvolutions?: FeatureEvolutionRow[];
  gaps: GapRow[];
}): DemoDatabase {
  const momentIdsByJourney = new Map<string, string[]>();
  for (const jm of rows.journeyMoments) {
    const list = momentIdsByJourney.get(jm.journey_id) ?? [];
    list.push(jm.moment_id);
    momentIdsByJourney.set(jm.journey_id, list);
  }

  return {
    products: (() => {
      const fromDb = (rows.products ?? [])
        .filter((p) => isProductId(p.id))
        .map((p) => ({
          id: p.id,
          name: p.name,
          shortName: p.short_name,
          description: p.description,
          order: p.sort_order,
          active: p.active,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }))
        .sort((a, b) => a.order - b.order);
      return fromDb.length > 0 ? fromDb : catalogAsProducts();
    })(),
    audiences: rows.audiences.map((a) => ({
      id: a.id,
      code: a.code as DemoDatabase["audiences"][number]["code"],
      name: a.name,
      description: a.description,
      active: a.active,
    })),
    moments: rows.moments.map((m) => ({
      id: m.id,
      code: m.code as DemoDatabase["moments"][number]["code"],
      name: m.name,
      description: m.description,
      active: m.active,
    })),
    journeys: rows.journeys.map((j) => ({
      id: j.id,
      name: j.name,
      description: j.description,
      order: j.sort_order,
      momentIds: momentIdsByJourney.get(j.id) ?? [],
      productIds: [],
      active: j.active,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    })),
    journeyAudienceStages: (rows.journeyAudienceStages ?? []).map((s) => ({
      id: s.id,
      audienceId: s.audience_id,
      journeyId: s.journey_id,
      displayName: s.display_name,
      sortOrder: s.sort_order,
      momentId: s.moment_id,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    userNeeds: rows.userNeeds.map((n) => ({
      id: n.id,
      journeyId: n.journey_id,
      name: n.name,
      description: n.description,
      priority: n.priority as DemoDatabase["userNeeds"][number]["priority"],
      active: n.active,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
    capabilities: rows.capabilities.map((c) => ({
      id: c.id,
      userNeedId: c.user_need_id,
      name: c.name,
      description: c.description,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    features: rows.features.map((f) => ({
      id: f.id,
      capabilityId: f.capability_id,
      name: f.name,
      description: f.description,
      product: f.product,
      priority: f.priority as DemoDatabase["features"][number]["priority"],
      owner: f.owner,
      uxOwner: f.ux_owner,
      cxOwner: f.cx_owner,
      productOwner: f.product_owner,
      active: f.active,
      isDemo: f.is_demo,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    })),
    channels: rows.channels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: c.type,
      active: c.active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    channelContexts: rows.channelContexts.map((c) => ({
      id: c.id,
      audienceId: c.audience_id,
      momentId: c.moment_id,
      channelId: c.channel_id,
      temporalStatus:
        c.temporal_status as DemoDatabase["channelContexts"][number]["temporalStatus"],
      notes: c.notes,
      active: c.active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
    featureChannelContexts: rows.featureChannelContexts.map((f) => {
      const phase = normalizeFeatureStage(f.phase || f.status);
      const statusRaw = f.status || "";
      const status =
        statusRaw in { ON_TRACK: 1, DELAYED: 1, NO_DEADLINE: 1 }
          ? normalizeDeadlineStatus(statusRaw)
          : deriveDeadlineStatus(f.expected_date, phase);
      const feature = rows.features.find((feat) => feat.id === f.feature_id);
      return {
        id: f.id,
        featureId: f.feature_id,
        productId: resolveProductId(f.product_id || feature?.product || undefined),
        channelContextId: f.channel_context_id,
        status,
        experience:
          f.experience as DemoDatabase["featureChannelContexts"][number]["experience"],
        phase,
        startDate: f.start_date,
        expectedDate: f.expected_date,
        launchDate: f.launch_date,
        responsible: f.responsible,
        notes: f.notes,
        updatedAt: f.updated_at,
      };
    }),
    evidences: rows.evidences.map((e) => ({
      id: e.id,
      featureId: e.feature_id,
      title: e.title,
      type: e.type as DemoDatabase["evidences"][number]["type"],
      description: e.description,
      link: e.link,
      date: e.evidence_date,
      responsible: e.responsible,
      filePath: e.file_path ?? null,
      fileName: e.file_name ?? null,
      fileMime: e.file_mime ?? null,
      fileSize: e.file_size ?? null,
    })),
    roadmapPhases: (rows.roadmapPhases ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      symbol: p.symbol ?? "",
      sortOrder: p.sort_order,
      active: p.active,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
    roadmapItems: rows.roadmapItems.map((r) => ({
      id: r.id,
      featureId: r.feature_id,
      channelContextId: r.channel_context_id,
      phase: normalizeFeatureStage(r.phase),
      startDate: r.start_date,
      expectedDate: r.expected_date,
      actualDate: r.actual_date,
      responsible: r.responsible,
      notes: r.notes,
    })),
    featureEvolutions: (rows.featureEvolutions ?? []).map((e) => ({
      id: e.id,
      featureChannelContextId: e.feature_channel_context_id,
      title: e.title,
      description: e.description ?? "",
      phase: (["BACKLOG", "UX_UI", "DEVELOPMENT", "HOMOLOGATION", "DONE"].includes(
        e.phase,
      )
        ? e.phase
        : "BACKLOG") as DemoDatabase["featureEvolutions"][number]["phase"],
      status: (["IN_PROGRESS", "DONE", "CANCELLED", "PAUSED"].includes(e.status)
        ? e.status
        : "IN_PROGRESS") as DemoDatabase["featureEvolutions"][number]["status"],
      priority: e.priority as DemoDatabase["featureEvolutions"][number]["priority"],
      startDate: e.start_date,
      expectedDate: e.expected_date,
      completedDate: e.completed_date,
      responsible: e.responsible ?? "",
      notes: e.notes ?? "",
      active: e.active !== false,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    })),
    gaps: rows.gaps.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      type: g.type as DemoDatabase["gaps"][number]["type"],
      audienceId: g.audience_id,
      momentId: g.moment_id,
      journeyId: g.journey_id,
      userNeedId: g.user_need_id,
      featureId: g.feature_id,
      productId: g.product_id ?? null,
      currentChannelId: g.current_channel_id,
      futureChannelId: g.future_channel_id,
      impact: g.impact as DemoDatabase["gaps"][number]["impact"],
      priority: g.priority as DemoDatabase["gaps"][number]["priority"],
      evidenceIds: g.evidence_ids ?? [],
      responsible: g.responsible,
      status: g.status as DemoDatabase["gaps"][number]["status"],
      actionPlan: g.action_plan,
      isDemo: g.is_demo,
    })),
  };
}
