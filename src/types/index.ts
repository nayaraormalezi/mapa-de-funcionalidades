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

/**
 * Origem estruturada da FeatureEvolution.
 * Stale / Insight severity NÃO são origins.
 */
export type EvolutionOrigin =
  | "MANUAL"
  | "COVERAGE_GAP"
  | "OPPORTUNITY"
  | "ISSUE";

/**
 * @deprecated Fase 11 — NÃO é fonte oficial de Health.
 * Health canônico: FeatureChannelEvaluation → buildChannelIntelligence → healthScore.
 * Campo persistido em FeatureChannelContext apenas para compatibilidade/legado (Map filters, seeds).
 * Preferir `healthScore` / `healthSignal` em FeatureMapRow.
 */
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

/** @deprecated Fase 12 — preferir `IssueType` (`@/lib/issue` ou reexport). */
export type IssueType = GapType;

export type GapStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "DEFERRED"
  | "WONT_FIX";

/** @deprecated Fase 12 — preferir `IssueStatus`. */
export type IssueStatus = GapStatus;

export type Impact = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Linha de produto do Consórcio (somente Imobiliário, Veículos Leves, Veículos Pesados). */
export interface Product {
  id: string;
  name: string;
  shortName: string;
  description: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  /** Produtos aos quais a jornada se aplica. Vazio = todos os produtos. */
  productIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Etapa dentro de uma jornada compartilhada.
 * Não confundir com Moment (Venda/Pós-venda) nem com JourneyAudienceStage (rótulo por público).
 */
export interface JourneyStage {
  id: string;
  journeyId: string;
  name: string;
  description: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Audience-specific customization of a catalog journey stage (rótulo/ordem por público). */
export interface JourneyAudienceStage {
  id: string;
  audienceId: string;
  /** Jornada canônica (ex.: jrn-consorcio). */
  journeyId: string;
  /**
   * Etapa da jornada (JourneyStage).
   * Null = legado pré-Fase 15 (quando journeyId apontava para a etapa).
   */
  journeyStageId: string | null;
  displayName: string;
  sortOrder: number;
  momentId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Necessidade do usuário (problema a resolver).
 * Cadeia conceitual: Jornada → Etapa → Necessidade → Funcionalidade.
 * Produto é aplicabilidade (productIds), não pai da necessidade.
 */
export interface UserNeed {
  id: string;
  /** Jornada (desnormalizado; derivável da etapa). */
  journeyId: string;
  /** Etapa da jornada. Null = necessidade ligada só à jornada (legado). */
  journeyStageId: string | null;
  /**
   * @deprecated Prefer productIds. Mantido como atalho = productIds[0] ou default.
   */
  productId: string;
  /**
   * Produtos aos quais a necessidade se aplica.
   * Vazio = todos os 3 produtos (transversal).
   */
  productIds: string[];
  /**
   * Públicos aos quais a necessidade se aplica.
   * Vazio = todos os públicos (transversal / cross).
   */
  audienceIds: string[];
  name: string;
  description: string;
  /**
   * Como será mensurado se a necessidade foi atendida
   * (métrica, sinal comportamental, indicador de negócio etc.).
   */
  measurement: string;
  priority: Priority;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * @deprecated Camada intermediária legada Need→Capability→Feature.
 * Novas funcionalidades ligam-se via feature_needs / feature_journeys.
 */
export interface Capability {
  id: string;
  userNeedId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** Ligação M2M Funcionalidade ↔ Necessidade. */
export interface FeatureNeed {
  featureId: string;
  userNeedId: string;
}

/** Ligação M2M Funcionalidade ↔ Jornada. */
export interface FeatureJourney {
  featureId: string;
  journeyId: string;
}

/**
 * Perfil de usuário associado à Feature.
 * Distinto de Público (Cliente/Economiário/Parceiro) e de responsável da task.
 * REGISTERED_USER → userId; MANUAL_PROFILE → profileName.
 */
export interface FeatureUserProfile {
  id: string;
  featureId: string;
  kind: "REGISTERED_USER" | "MANUAL_PROFILE";
  userId: string | null;
  profileName: string | null;
  /** Nome exibido (perfil manual ou fullName do usuário). */
  displayName: string;
  /** E-mail quando usuário cadastrado. */
  email: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Funcionalidade = capacidade reutilizável (objeto central).
 * Status NÃO vive aqui — vive na Implementação.
 * Produto = aplicabilidade declarada (productIds); existência concreta = FCC.
 */
export interface Feature {
  id: string;
  /** @deprecated Prefer needIds. Mantido para compatibilidade com capability. */
  capabilityId: string | null;
  name: string;
  description: string;
  /** @deprecated Use productIds / productId na implementação. */
  product: string;
  /**
   * Produtos aos quais a funcionalidade se aplica.
   * Vazio = todos (ou derivar das implementações).
   */
  productIds: string[];
  /** Necessidades atendidas (M2M). */
  needIds: string[];
  /** Jornadas em que participa (M2M). */
  journeyIds: string[];
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

/**
 * Implementação = existência da funcionalidade em um contexto concreto.
 * É o objeto que possui fase/status (não a funcionalidade global).
 * Grão: Feature × Product × ChannelContext (público + momento + canal).
 */
export interface FeatureChannelContext {
  id: string;
  featureId: string;
  /** Produto desta implementação (dimensão estrutural). */
  productId: string;
  channelContextId: string;
  /** Status de prazo (on track / delayed / sem prazo). */
  status: FeatureStatus;
  /**
   * @deprecated Fase 11 — legado. Não usar como Health oficial.
   * Preferir Evaluation → buildChannelIntelligence.
   */
  experience: ExperienceLevel;
  /** Fase do funil: Backlog → UX/UI → Dev → Homologação → Disponível. */
  phase: RoadmapPhase;
  startDate: string | null;
  expectedDate: string | null;
  launchDate: string | null;
  responsible: string;
  notes: string;
  /** Link do Figma da experiência (opcional). */
  figmaUrl?: string | null;
  /** URL de screenshot/thumbnail da experiência (opcional). */
  experienceImageUrl?: string | null;
  /** URL externa da experiência em produção/homolog (opcional). */
  experienceUrl?: string | null;
  /**
   * Número do ticket/chamado de TI desta implementação (opcional).
   * Livre — não assume formato fixo. Pertence ao FCC, não à Feature.
   * Futuro: ticketUrl pode complementar sem alterar este campo.
   */
  ticketNumber?: string | null;
  /** Texto livre da avaliação da experiência neste canal. */
  evaluationNotes?: string;
  /** Data do resultado de pesquisa vinculado. */
  researchDate?: string | null;
  researchFilePath?: string | null;
  researchFileName?: string | null;
  researchFileMime?: string | null;
  researchFileSize?: number | null;
  /** URL assinada para download (não persistida). */
  researchFileUrl?: string | null;
  /** Indica se a implementação precisa de evolução. */
  needsEvolution?: boolean;
  updatedAt: string;
}

/** Alias canônico — use Implementation na UI e na documentação do modelo. */
export type Implementation = FeatureChannelContext;

export interface Evidence {
  id: string;
  /**
   * Owner canônico (Fase 7): FEATURE | EVALUATION.
   * Preferir estes campos; legados abaixo são fallback.
   */
  ownerType?: "FEATURE" | "EVALUATION";
  ownerId?: string;
  /** Quando owner é EVALUATION — FeatureChannelEvaluation.id */
  evaluationId?: string | null;
  /** Funcionalidade (obrigatório quando owner=FEATURE; denormalizado em EVALUATION). */
  featureId: string | null;
  /**
   * @deprecated Fase 7 — não é owner canônico. Preferir FEATURE ou EVALUATION.
   */
  userNeedId: string | null;
  /**
   * @deprecated Fase 7 — Evolution não é owner de Evidence.
   * Manter para legado; novas evidências de evolução usam FEATURE (+ featureId).
   */
  featureEvolutionId: string | null;
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

/**
 * @deprecated Fase 6 — legado. Fonte de verdade do planejamento:
 * FeatureChannelContext (Implementation) + FeatureEvolution.
 * Roadmap é VIEW sobre essas entidades. Não criar novos RoadmapItems.
 * Remoção da tabela: fase futura, após zero consumidores e backup.
 */
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
  /**
   * Origem estruturada da criação.
   * Ausente/legado → tratar como MANUAL via normalizeEvolutionOrigin.
   */
  origin?: EvolutionOrigin;
  priority: Priority;
  startDate: string | null;
  expectedDate: string | null;
  completedDate: string | null;
  responsible: string;
  notes: string;
  /**
   * Como será mensurado o sucesso da evolução
   * (métrica, hipótese, indicador de resultado).
   */
  measurement: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Avaliação UX/CX de uma funcionalidade em um contexto de canal.
 * Histórico append-friendly: novas avaliações não sobrescrevem as anteriores.
 * Escopo: Feature × ChannelContext (compartilhada entre produtos do card).
 */
export type EvaluationArea =
  | "CX"
  | "UX"
  | "UI"
  | "ACCESSIBILITY"
  | "CONTENT"
  | "DATA";

export type EvaluationStudyType =
  | "QUANTITATIVE"
  | "QUALITATIVE"
  | "EXPERT"
  | "BEHAVIORAL"
  | "VISUAL"
  | "CUSTOM";

export type EvaluationRecordStatus =
  | "NOT_EVALUATED"
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NEEDS_UPDATE";

export type EvaluationFindingSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** Achado qualitativo estruturado (armazenado em results.findings_list). */
export interface EvaluationFinding {
  id?: string;
  description: string;
  severity: EvaluationFindingSeverity;
  /** Participantes afetados. */
  affectedCount?: number;
  /** Total de participantes da sessão. */
  participantTotal?: number;
  journeyStage?: string;
  impact?: string;
  evidence?: string;
  recommendation?: string;
}

export interface FeatureChannelEvaluation {
  id: string;
  featureId: string;
  channelContextId: string;
  /** FCC de referência (upload / vínculo opcional). */
  featureChannelContextId: string | null;
  area: EvaluationArea;
  studyType: EvaluationStudyType;
  methodCode: string;
  /** Nome livre quando methodCode = CUSTOM. */
  methodCustomName: string;
  name: string;
  objective: string;
  status: EvaluationRecordStatus;
  evaluatedAt: string | null;
  responsible: string;
  audienceSegment: string;
  /**
   * Resultados do método (JSON), incluindo opcionalmente:
   * - benchmark_value / benchmark_scope (snapshot auditável)
   * - findings_list: EvaluationFinding[]
   * - quick_backs / dropoff (sinais comportamentais)
   */
  results: Record<string, unknown>;
  findings: string;
  notes: string;
  researchUrl: string | null;
  reportUrl: string | null;
  figmaUrl: string | null;
  evidenceFilePath: string | null;
  evidenceFileName: string | null;
  evidenceFileMime: string | null;
  evidenceFileSize: number | null;
  evidenceFileUrl?: string | null;
  needsEvolution: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Issue persistida (Gap₂ histórico).
 *
 * @deprecated O nome `Gap` gera ambiguidade com Coverage Gap.
 * Preferir o alias `Issue` (`import type { Issue } from "@/lib/issue"` ou
 * `import type { Issue } from "@/types"`).
 *
 * Storage: tabela Supabase `gaps` (não renomeada nesta fase).
 * Coverage Gap = `DetectedCoverageGap` / `HubCoverageGap` (derivado, não esta entidade).
 */
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
  /** Produto ao qual a issue se refere (opcional = transversal). */
  productId: string | null;
  currentChannelId: string | null;
  futureChannelId: string | null;
  impact: Impact;
  priority: Priority;
  /**
   * @deprecated Fase 7/8A — não é fonte de verdade de Evidence.
   * Preferir Evidence.owner FEATURE/EVALUATION.
   * Mantido para leitura/compatibilidade; upsertIssue/upsertGap não escrevem mais este campo.
   */
  evidenceIds: string[];
  responsible: string;
  status: GapStatus;
  actionPlan: string;
  isDemo: boolean;
}

/**
 * Nome canônico da entidade persistida (ex-Gap₂).
 * Mesmo shape que `Gap`; use este nome em código novo.
 */
export type Issue = Gap;

/** Flattened row for map / matrix / filters (= uma implementação). */
export interface FeatureMapRow {
  featureId: string;
  featureName: string;
  featureDescription: string;
  productId: string;
  product: string;
  productShortName: string;
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
  journeyStageId: string | null;
  journeyStageName: string | null;
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
  /**
   * @deprecated Fase 11 — legado. Preferir healthScore / healthSignal.
   */
  experience: ExperienceLevel;
  /**
   * Saúde canônica 0–100 (Evaluation → Intelligence).
   * null = NOT_EVALUATED / UNKNOWN — nunca tratar como 0.
   */
  healthScore: number | null;
  /** Sinal derivado de healthScore (UNKNOWN se score null). */
  healthSignal: "GOOD" | "ATTENTION" | "CRITICAL" | "UNKNOWN";
  phase: RoadmapPhase;
  startDate: string | null;
  expectedDate: string | null;
  launchDate: string | null;
  responsible: string;
  notes: string;
  figmaUrl?: string | null;
  experienceImageUrl?: string | null;
  experienceUrl?: string | null;
  /** Ticket TI desta implementação (FCC). */
  ticketNumber?: string | null;
  evaluationNotes?: string;
  researchDate?: string | null;
  researchFilePath?: string | null;
  researchFileName?: string | null;
  researchFileMime?: string | null;
  researchFileSize?: number | null;
  researchFileUrl?: string | null;
  needsEvolution?: boolean;
  /** Chaves de filtro de perfil de usuário (user:uuid | manual:nome). */
  userProfileKeys?: string[];
  /** Rótulos exibíveis dos perfis associados à Feature. */
  userProfileLabels?: string[];
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
  /**
   * @deprecated Fase 14 — ExperienceLevel não filtra mais o mapa.
   * Preferir `healthSignals`. Mantido vazio para compatibilidade de estado.
   */
  experiences: ExperienceLevel[];
  /** Filtro canônico de Health (Evaluation → healthSignal). */
  healthSignals: Array<"GOOD" | "ATTENTION" | "CRITICAL" | "UNKNOWN">;
  /** Product ids (preferred). */
  productIds: string[];
  /** @deprecated Prefer productIds. Kept for filtros legados por nome. */
  products: string[];
  priorities: Priority[];
  responsibles: string[];
  phases: RoadmapPhase[];
  /** Filtro por perfil de usuário (user:id | manual:nome-normalizado). */
  userProfileKeys: string[];
}

export interface DashboardKpis {
  totalFeatures: number;
  available: number;
  inDevelopment: number;
  planned: number;
  gaps: number;
  withProblem: number;
}

/**
 * Cobertura baseada em IMPLEMENTAÇÕES (não em funcionalidades distintas).
 * total = contextos de canal; available = implementações em fase Disponível.
 */
export interface CoverageItem {
  id: string;
  name: string;
  /** Total de implementações (FCC) no escopo. */
  total: number;
  /** Implementações com phase === AVAILABLE. */
  available: number;
  percentage: number;
  /** Funcionalidades distintas no escopo (métrica auxiliar). */
  featureCount?: number;
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
  /** Issues persistidas relacionadas aos canais (≠ Coverage Gap). */
  issues: Issue[];
}

export interface DemoDatabase {
  products: Product[];
  audiences: Audience[];
  moments: Moment[];
  journeys: Journey[];
  journeyStages: JourneyStage[];
  journeyAudienceStages: JourneyAudienceStage[];
  userNeeds: UserNeed[];
  capabilities: Capability[];
  features: Feature[];
  featureNeeds: FeatureNeed[];
  featureJourneys: FeatureJourney[];
  featureUserProfiles: FeatureUserProfile[];
  channels: Channel[];
  channelContexts: ChannelContext[];
  /** Implementações (Feature × Product × ChannelContext). */
  featureChannelContexts: FeatureChannelContext[];
  evidences: Evidence[];
  roadmapPhases: RoadmapPhaseDef[];
  /**
   * @deprecated Fase 6 — legado. Preferir featureChannelContexts + featureEvolutions.
   * Mantido para leitura/compatibilidade; não é fonte de verdade do /roadmap.
   */
  roadmapItems: RoadmapItem[];
  featureEvolutions: FeatureEvolution[];
  featureChannelEvaluations: FeatureChannelEvaluation[];
  /**
   * Issues (ex-Gap₂). Chave/tabela física: `gaps`.
   * Coverage Gap derivado NÃO é persistido aqui.
   */
  gaps: Issue[];
}
