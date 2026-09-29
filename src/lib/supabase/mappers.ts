import type { DemoDatabase } from "@/types";
import {
  normalizeEvolutionOrigin,
  reconcileEvolutionStatusPhase,
} from "@/lib/evolution";
import { normalizeEvidenceOwnerFields } from "@/lib/evidence";
import {
  deriveDeadlineStatus,
  normalizeDeadlineStatus,
  normalizeFeatureStage,
} from "@/lib/labels";
import {
  catalogAsProducts,
  isProductId,
  normalizeProductIds,
  resolveProductId,
} from "@/lib/products";

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
  /** Fase 15 — etapa canônica. Ausente em bases legadas. */
  journey_stage_id?: string | null;
  display_name: string;
  sort_order: number;
  moment_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type JourneyStageRow = {
  id: string;
  journey_id: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserNeedRow = {
  id: string;
  journey_id: string;
  journey_stage_id?: string | null;
  product_id?: string | null;
  product_ids?: string[] | null;
  audience_ids?: string[] | null;
  name: string;
  description: string;
  measurement?: string | null;
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
  capability_id: string | null;
  name: string;
  description: string;
  product: string;
  product_ids?: string[] | null;
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

export type FeatureNeedRow = {
  feature_id: string;
  user_need_id: string;
};

export type FeatureJourneyRow = {
  feature_id: string;
  journey_id: string;
};

export type FeatureChannelContextResponsibleRow = {
  id: string;
  feature_channel_context_id: string;
  user_id: string | null;
  responsible_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?:
    | { full_name?: string | null; email?: string | null }
    | { full_name?: string | null; email?: string | null }[]
    | null;
};

export type FeatureEvolutionResponsibleRow = {
  id: string;
  feature_evolution_id: string;
  user_id: string | null;
  responsible_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  profiles?:
    | { full_name?: string | null; email?: string | null }
    | { full_name?: string | null; email?: string | null }[]
    | null;
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
  figma_url?: string | null;
  experience_image_url?: string | null;
  experience_url?: string | null;
  /** Ticket/chamado de TI desta implementação (Fase 15.7). */
  ticket_number?: string | null;
  evaluation_notes?: string | null;
  research_date?: string | null;
  research_file_path?: string | null;
  research_file_name?: string | null;
  research_file_mime?: string | null;
  research_file_size?: number | null;
  needs_evolution?: boolean | null;
  active: boolean;
  updated_at: string;
};

export type EvidenceRow = {
  id: string;
  feature_id: string | null;
  user_need_id?: string | null;
  feature_evolution_id?: string | null;
  /** Fase 7 — vínculo canônico com FeatureChannelEvaluation (nullable até migration). */
  evaluation_id?: string | null;
  owner_type?: string | null;
  owner_id?: string | null;
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

/** @deprecated Fase 6 — row legada de `roadmap_items`; /roadmap não depende dela. */
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
  origin?: string | null;
  priority: string;
  start_date: string | null;
  expected_date: string | null;
  completed_date: string | null;
  responsible: string;
  notes: string;
  measurement?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FeatureChannelEvaluationRow = {
  id: string;
  feature_id: string;
  channel_context_id: string;
  feature_channel_context_id: string | null;
  area: string;
  study_type: string;
  method_code: string;
  method_custom_name?: string | null;
  name: string;
  objective?: string | null;
  status: string;
  evaluated_at: string | null;
  responsible?: string | null;
  audience_segment?: string | null;
  results?: Record<string, unknown> | null;
  findings?: string | null;
  notes?: string | null;
  research_url?: string | null;
  report_url?: string | null;
  figma_url?: string | null;
  evidence_file_path?: string | null;
  evidence_file_name?: string | null;
  evidence_file_mime?: string | null;
  evidence_file_size?: number | null;
  needs_evolution?: boolean | null;
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
  journeyStages?: JourneyStageRow[];
  journeyAudienceStages?: JourneyAudienceStageRow[];
  userNeeds: UserNeedRow[];
  capabilities: CapabilityRow[];
  features: FeatureRow[];
  featureNeeds?: FeatureNeedRow[];
  featureJourneys?: FeatureJourneyRow[];
  featureChannelContextResponsibles?: FeatureChannelContextResponsibleRow[];
  featureEvolutionResponsibles?: FeatureEvolutionResponsibleRow[];
  channels: ChannelRow[];
  channelContexts: ChannelContextRow[];
  featureChannelContexts: FeatureChannelContextRow[];
  evidences: EvidenceRow[];
  roadmapPhases?: RoadmapPhaseRow[];
  roadmapItems: RoadmapItemRow[];
  featureEvolutions?: FeatureEvolutionRow[];
  featureChannelEvaluations?: FeatureChannelEvaluationRow[];
  gaps: GapRow[];
}): DemoDatabase {
  const momentIdsByJourney = new Map<string, string[]>();
  function addJourneyMoment(journeyId: string, momentId: string) {
    if (!journeyId || !momentId) return;
    const list = momentIdsByJourney.get(journeyId) ?? [];
    if (!list.includes(momentId)) list.push(momentId);
    momentIdsByJourney.set(journeyId, list);
  }
  for (const jm of rows.journeyMoments) {
    addJourneyMoment(jm.journey_id, jm.moment_id);
  }
  // Fonte canônica pós consolidação: momentos das etapas por público (JAS).
  // journey_moments pode estar desatualizado (ex.: só jornadas legadas inativas).
  for (const jas of rows.journeyAudienceStages ?? []) {
    if (jas.active === false) continue;
    addJourneyMoment(jas.journey_id, jas.moment_id);
  }

  const capabilityById = new Map(
    rows.capabilities.map((c) => [c.id, c] as const),
  );
  const needById = new Map(rows.userNeeds.map((n) => [n.id, n] as const));

  function mapResponsibleRow(
    ownerKind: "FCC" | "EVOLUTION",
    ownerId: string,
    row: {
      id: string;
      user_id: string | null;
      responsible_name: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
      profiles?:
        | { full_name?: string | null; email?: string | null }
        | { full_name?: string | null; email?: string | null }[]
        | null;
    },
  ) {
    const isRegistered = Boolean(row.user_id);
    const profileJoin = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const fullName = profileJoin?.full_name?.trim() || null;
    const email = profileJoin?.email?.trim() || null;
    const manualName = row.responsible_name?.trim() || null;
    return {
      id: row.id,
      ownerKind,
      ownerId,
      kind: (isRegistered ? "REGISTERED_USER" : "MANUAL") as
        | "REGISTERED_USER"
        | "MANUAL",
      userId: row.user_id,
      responsibleName: isRegistered ? null : manualName,
      displayName: isRegistered
        ? fullName || email || "Usuário"
        : manualName || "Responsável",
      email: isRegistered ? email : null,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const responsiblesByFcc = new Map<
    string,
    ReturnType<typeof mapResponsibleRow>[]
  >();
  for (const row of rows.featureChannelContextResponsibles ?? []) {
    const list = responsiblesByFcc.get(row.feature_channel_context_id) ?? [];
    list.push(
      mapResponsibleRow("FCC", row.feature_channel_context_id, row),
    );
    responsiblesByFcc.set(row.feature_channel_context_id, list);
  }

  const responsiblesByEvo = new Map<
    string,
    ReturnType<typeof mapResponsibleRow>[]
  >();
  for (const row of rows.featureEvolutionResponsibles ?? []) {
    const list = responsiblesByEvo.get(row.feature_evolution_id) ?? [];
    list.push(mapResponsibleRow("EVOLUTION", row.feature_evolution_id, row));
    responsiblesByEvo.set(row.feature_evolution_id, list);
  }

  let featureNeedRows = rows.featureNeeds ?? [];
  let featureJourneyRows = rows.featureJourneys ?? [];

  if (featureNeedRows.length === 0) {
    featureNeedRows = rows.features
      .map((f) => {
        const cap = f.capability_id
          ? capabilityById.get(f.capability_id)
          : undefined;
        if (!cap) return null;
        return { feature_id: f.id, user_need_id: cap.user_need_id };
      })
      .filter((x): x is FeatureNeedRow => Boolean(x));
  }
  if (featureJourneyRows.length === 0) {
    const seen = new Set<string>();
    featureJourneyRows = [];
    for (const link of featureNeedRows) {
      const need = needById.get(link.user_need_id);
      if (!need?.journey_id) continue;
      const key = `${link.feature_id}:${need.journey_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      featureJourneyRows.push({
        feature_id: link.feature_id,
        journey_id: need.journey_id,
      });
    }
  }

  const needIdsByFeature = new Map<string, string[]>();
  for (const link of featureNeedRows) {
    const list = needIdsByFeature.get(link.feature_id) ?? [];
    if (!list.includes(link.user_need_id)) list.push(link.user_need_id);
    needIdsByFeature.set(link.feature_id, list);
  }
  const journeyIdsByFeature = new Map<string, string[]>();
  for (const link of featureJourneyRows) {
    const list = journeyIdsByFeature.get(link.feature_id) ?? [];
    if (!list.includes(link.journey_id)) list.push(link.journey_id);
    journeyIdsByFeature.set(link.feature_id, list);
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
    journeyStages: (rows.journeyStages ?? []).map((s) => ({
      id: s.id,
      journeyId: s.journey_id,
      name: s.name,
      description: s.description,
      order: s.sort_order,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    journeyAudienceStages: (rows.journeyAudienceStages ?? []).map((s) => ({
      id: s.id,
      audienceId: s.audience_id,
      journeyId: s.journey_id,
      journeyStageId: s.journey_stage_id ?? null,
      displayName: s.display_name,
      sortOrder: s.sort_order,
      momentId: s.moment_id,
      active: s.active,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    userNeeds: rows.userNeeds.map((n) => {
      const productIds = normalizeProductIds(n.product_ids, n.product_id);
      const audienceIds = Array.from(
        new Set(
          (n.audience_ids ?? []).map((id) => String(id).trim()).filter(Boolean),
        ),
      );
      return {
        id: n.id,
        journeyId: n.journey_id,
        journeyStageId: n.journey_stage_id ?? null,
        productId: productIds[0] ?? resolveProductId(n.product_id),
        productIds,
        audienceIds,
        name: n.name,
        description: n.description,
        measurement: n.measurement ?? "",
        priority: n.priority as DemoDatabase["userNeeds"][number]["priority"],
        active: n.active,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      };
    }),
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
      productIds: normalizeProductIds(f.product_ids),
      needIds: needIdsByFeature.get(f.id) ?? [],
      journeyIds: journeyIdsByFeature.get(f.id) ?? [],
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
    featureNeeds: featureNeedRows.map((l) => ({
      featureId: l.feature_id,
      userNeedId: l.user_need_id,
    })),
    featureJourneys: featureJourneyRows.map((l) => ({
      featureId: l.feature_id,
      journeyId: l.journey_id,
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
        responsibles: responsiblesByFcc.get(f.id) ?? [],
        notes: f.notes,
        figmaUrl: f.figma_url ?? null,
        experienceImageUrl: f.experience_image_url ?? null,
        experienceUrl: f.experience_url ?? null,
        ticketNumber: f.ticket_number?.trim() ? f.ticket_number.trim() : null,
        evaluationNotes: f.evaluation_notes ?? "",
        researchDate: f.research_date ?? null,
        researchFilePath: f.research_file_path ?? null,
        researchFileName: f.research_file_name ?? null,
        researchFileMime: f.research_file_mime ?? null,
        researchFileSize: f.research_file_size ?? null,
        needsEvolution: Boolean(f.needs_evolution),
        updatedAt: f.updated_at,
      };
    }),
    evidences: rows.evidences.map((e) => {
      const normalized = normalizeEvidenceOwnerFields({
        ownerType: e.owner_type,
        ownerId: e.owner_id,
        evaluationId: e.evaluation_id,
        featureId: e.feature_id,
      });
      return {
        id: e.id,
        ownerType: normalized.ownerType,
        ownerId: normalized.ownerId,
        evaluationId: normalized.evaluationId,
        featureId: normalized.featureId,
        userNeedId: e.user_need_id ?? null,
        featureEvolutionId: e.feature_evolution_id ?? null,
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
      };
    }),
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
    featureEvolutions: (rows.featureEvolutions ?? []).map((e) => {
      const aligned = reconcileEvolutionStatusPhase(e.status, e.phase);
      return {
        id: e.id,
        featureChannelContextId: e.feature_channel_context_id,
        title: e.title,
        description: e.description ?? "",
        phase: aligned.phase,
        status: aligned.status,
        origin: normalizeEvolutionOrigin(e.origin),
        priority: e.priority as DemoDatabase["featureEvolutions"][number]["priority"],
        startDate: e.start_date,
        expectedDate: e.expected_date,
        completedDate: e.completed_date,
        responsible: e.responsible ?? "",
        responsibles: responsiblesByEvo.get(e.id) ?? [],
        notes: e.notes ?? "",
        measurement: e.measurement ?? "",
        active: e.active !== false,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      };
    }),
    featureChannelEvaluations: (rows.featureChannelEvaluations ?? []).map((e) => ({
      id: e.id,
      featureId: e.feature_id,
      channelContextId: e.channel_context_id,
      featureChannelContextId: e.feature_channel_context_id,
      area: e.area as DemoDatabase["featureChannelEvaluations"][number]["area"],
      studyType:
        e.study_type as DemoDatabase["featureChannelEvaluations"][number]["studyType"],
      methodCode: e.method_code,
      methodCustomName: e.method_custom_name ?? "",
      name: e.name ?? "",
      objective: e.objective ?? "",
      status:
        e.status as DemoDatabase["featureChannelEvaluations"][number]["status"],
      evaluatedAt: e.evaluated_at,
      responsible: e.responsible ?? "",
      audienceSegment: e.audience_segment ?? "",
      results: (e.results ?? {}) as Record<string, unknown>,
      findings: e.findings ?? "",
      notes: e.notes ?? "",
      researchUrl: e.research_url ?? null,
      reportUrl: e.report_url ?? null,
      figmaUrl: e.figma_url ?? null,
      evidenceFilePath: e.evidence_file_path ?? null,
      evidenceFileName: e.evidence_file_name ?? null,
      evidenceFileMime: e.evidence_file_mime ?? null,
      evidenceFileSize: e.evidence_file_size ?? null,
      needsEvolution: Boolean(e.needs_evolution),
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
