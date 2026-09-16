/** Domain types — mirror the PostgreSQL schema. */

export type UserRole = "admin" | "editor" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: number;
  tableName: string;
  recordId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  createdAt: string;
}

export type AudienceCode = "CLIENT" | "ECONOMIARIO" | "PARTNER";
export type MomentCode = "SALE" | "AFTER_SALE";
export type TemporalStatus = "CURRENT" | "FUTURE" | "DEPRECATED";

/** Etapa da funcionalidade no funil (Backlog → Disponível). */
export type FeatureStage =
  | "BACKLOG"
  | "UX_UI"
  | "DEVELOPMENT"
  | "HOMOLOGATION"
  | "PAUSED"
  | "REMOVED"
  | "AVAILABLE";

/** Status de prazo da funcionalidade. */
export type FeatureStatus = "ON_TRACK" | "DELAYED" | "NO_DEADLINE";

/** Status da iniciativa de evolução (não confundir com fase da implementação). */
export type EvolutionStatus =
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED"
  | "PAUSED";

/** Fase do trabalho da evolução (pipeline da melhoria). */
export type EvolutionPhase =
  | "BACKLOG"
  | "UX_UI"
  | "DEVELOPMENT"
  | "HOMOLOGATION"
  | "DONE";

export type ExperienceLevel =
  | "NOT_EVALUATED"
  | "GOOD"
  | "ADEQUATE"
  | "NEEDS_IMPROVEMENT"
  | "CRITICAL";

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Código da etapa no roadmap (mesmo catálogo de FeatureStage). */
export type RoadmapPhase = FeatureStage;

export type EvidenceType =
  | "UX_RESEARCH"
  | "INTERVIEW"
  | "COMPLAINT"
  | "ANALYTICS"
  | "HOTJAR"
  | "MATOMO"
  | "SUPPORT"
  | "CX_JOURNEY"
  | "BENCHMARK"
  | "INTERNAL_INSIGHT"
  | "OTHER";

export type GapType =
  | "COVERAGE"
  | "EXPERIENCE"
  | "CONSISTENCY"
  | "INFORMATION"
  | "OPERATIONAL"
  | "TRANSITION";

export type GapStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "DEFERRED"
  | "WONT_FIX";

export type Impact = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface Audience {
  id: string;
  code: AudienceCode;
  name: string;
  description: string;
  active: boolean;
}

export interface Moment {
  id: string;
  code: MomentCode;
  name: string;
  description: string;
  active: boolean;
}

export interface Journey {
  id: string;
  name: string;
  description: string;
  order: number;
  momentIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Audience-specific customization of a catalog journey stage. */
export interface JourneyAudienceStage {
  id: string;
  audienceId: string;
  journeyId: string;
  displayName: string;
  sortOrder: number;
  momentId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserNeed {
  id: string;
  journeyId: string;
  name: string;
  description: string;
  priority: Priority;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Capability {
  id: string;
  userNeedId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feature {
  id: string;
  capabilityId: string;
  name: string;
  description: string;
  product: string;
  priority: Priority;
  owner: string;
  uxOwner: string;
  cxOwner: string;
  productOwner: string;
  active: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  type: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelContext {
  id: string;
  audienceId: string;
  momentId: string;
  channelId: string;
  temporalStatus: TemporalStatus;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureChannelContext {
  id: string;
  featureId: string;
  channelContextId: string;
  status: FeatureStatus;
  experience: ExperienceLevel;
  phase: RoadmapPhase;
  startDate: string | null;
  expectedDate: string | null;
  launchDate: string | null;
  responsible: string;
  notes: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  featureId: string;
  title: string;
  type: EvidenceType;
  description: string;
  link: string | null;
  date: string;
  responsible: string;
  /** Caminho no bucket Storage `evidences`. */
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  /** URL assinada para download/preview (não persistida). */
  fileUrl?: string | null;
}

export interface RoadmapPhaseDef {
  id: string;
  code: string;
  name: string;
  /** Símbolo visual ex.: ◌ ◐ Ⅱ */
  symbol: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapItem {
  id: string;
  featureId: string;
  channelContextId: string | null;
  phase: RoadmapPhase;
  startDate: string | null;
  expectedDate: string | null;
  actualDate: string | null;
  responsible: string;
  notes: string;
}

/** Evolução/melhoria vinculada a uma implementação (feature + canal). */
export interface FeatureEvolution {
  id: string;
  featureChannelContextId: string;
  title: string;
  description: string;
  phase: EvolutionPhase;
  status: EvolutionStatus;
  priority: Priority;
  startDate: string | null;
  expectedDate: string | null;
  completedDate: string | null;
  responsible: string;
  notes: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Gap {
  id: string;
  title: string;
  description: string;
  type: GapType;
  audienceId: string;
  momentId: string;
  journeyId: string;
  userNeedId: string;
  featureId: string | null;
  currentChannelId: string | null;
  futureChannelId: string | null;
  impact: Impact;
  priority: Priority;
  evidenceIds: string[];
  responsible: string;
  status: GapStatus;
  actionPlan: string;
  isDemo: boolean;
}

/** Flattened row for map / matrix / filters */
export interface FeatureMapRow {
  featureId: string;
  featureName: string;
  featureDescription: string;
  product: string;
  priority: Priority;
  owner: string;
  uxOwner: string;
  cxOwner: string;
  productOwner: string;
  isDemo: boolean;
  audienceId: string;
  audienceCode: AudienceCode;
  audienceName: string;
  momentId: string;
  momentCode: MomentCode;
  momentName: string;
  journeyId: string;
  journeyName: string;
  userNeedId: string;
  userNeedName: string;
  capabilityId: string;
  capabilityName: string;
  channelId: string;
  channelName: string;
  channelContextId: string;
  temporalStatus: TemporalStatus;
  featureChannelContextId: string;
  status: FeatureStatus;
  experience: ExperienceLevel;
  phase: RoadmapPhase;
  startDate: string | null;
  expectedDate: string | null;
  launchDate: string | null;
  responsible: string;
  notes: string;
}

export interface MapFilters {
  search: string;
  audienceIds: string[];
  momentIds: string[];
  journeyIds: string[];
  userNeedIds: string[];
  featureIds: string[];
  channelIds: string[];
  temporalStatuses: TemporalStatus[];
  statuses: FeatureStatus[];
  experiences: ExperienceLevel[];
  products: string[];
  priorities: Priority[];
  responsibles: string[];
  phases: RoadmapPhase[];
}

export interface DashboardKpis {
  totalFeatures: number;
  available: number;
  inDevelopment: number;
  planned: number;
  gaps: number;
  withProblem: number;
}

export interface CoverageItem {
  id: string;
  name: string;
  total: number;
  available: number;
  percentage: number;
}

export interface TransformationSummary {
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  currentChannels: { id: string; name: string }[];
  futureChannels: { id: string; name: string }[];
  remain: FeatureMapRow[];
  migrate: FeatureMapRow[];
  create: FeatureMapRow[];
  discontinue: FeatureMapRow[];
  undefined: FeatureMapRow[];
}

export interface ChannelComparison {
  channelAId: string;
  channelBId: string;
  common: Feature[];
  onlyA: Feature[];
  onlyB: Feature[];
  gaps: Gap[];
}

export interface DemoDatabase {
  audiences: Audience[];
  moments: Moment[];
  journeys: Journey[];
  journeyAudienceStages: JourneyAudienceStage[];
  userNeeds: UserNeed[];
  capabilities: Capability[];
  features: Feature[];
  channels: Channel[];
  channelContexts: ChannelContext[];
  featureChannelContexts: FeatureChannelContext[];
  evidences: Evidence[];
  roadmapPhases: RoadmapPhaseDef[];
  roadmapItems: RoadmapItem[];
  featureEvolutions: FeatureEvolution[];
  gaps: Gap[];
}
