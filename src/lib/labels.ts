import type {
  EvidenceType,
  ExperienceLevel,
  FeatureStage,
  FeatureStatus,
  GapStatus,
  GapType,
  Priority,
  TemporalStatus,
} from "@/types";

export const temporalStatusLabel: Record<TemporalStatus, string> = {
  CURRENT: "Atual",
  FUTURE: "Futuro",
  DEPRECATED: "Depreciado",
};

/** Etapa da funcionalidade no funil (Backlog → Disponível). */
export const featureStageLabel: Record<FeatureStage, string> = {
  BACKLOG: "Backlog",
  UX_UI: "UX/UI",
  DEVELOPMENT: "Em desenvolvimento",
  HOMOLOGATION: "Homologação",
  PAUSED: "Pausado",
  REMOVED: "Removido",
  AVAILABLE: "Disponível",
};

/** Ordem oficial de exibição das etapas. */
export const FEATURE_STAGE_ORDER: FeatureStage[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "PAUSED",
  "REMOVED",
  "AVAILABLE",
];

export function featureStageOptions(): {
  value: FeatureStage;
  label: string;
}[] {
  return FEATURE_STAGE_ORDER.map((value) => ({
    value,
    label: featureStageLabel[value],
  }));
}

/** Catálogo oficial de etapas para roadmap/kanban. */
export function officialStageCatalog(): {
  id: string;
  code: FeatureStage;
  name: string;
  symbol: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}[] {
  return FEATURE_STAGE_ORDER.map((code, index) => ({
    id: `stage-${code.toLowerCase()}`,
    code,
    name: featureStageLabel[code],
    symbol: "",
    sortOrder: index + 1,
    active: true,
    createdAt: "",
    updatedAt: "",
  }));
}

/** Status de prazo da funcionalidade. */
export const featureStatusLabel: Record<FeatureStatus, string> = {
  ON_TRACK: "Em dia",
  DELAYED: "Atrasado",
  NO_DEADLINE: "Sem prazo",
};

export const FEATURE_STATUS_ORDER: FeatureStatus[] = [
  "ON_TRACK",
  "DELAYED",
  "NO_DEADLINE",
];

export function featureStatusOptions(): {
  value: FeatureStatus;
  label: string;
}[] {
  return FEATURE_STATUS_ORDER.map((value) => ({
    value,
    label: featureStatusLabel[value],
  }));
}

export const experienceLabel: Record<ExperienceLevel, string> = {
  NOT_EVALUATED: "Não avaliada",
  GOOD: "Boa",
  ADEQUATE: "Adequada",
  NEEDS_IMPROVEMENT: "Precisa melhorar",
  CRITICAL: "Crítica",
};

export const priorityLabel: Record<Priority, string> = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

/** Alias legado — preferir featureStageLabel. */
export const roadmapPhaseLabel: Record<string, string> = {
  ...featureStageLabel,
};

const LEGACY_STAGE_MAP: Record<string, FeatureStage> = {
  NEED_IDENTIFIED: "BACKLOG",
  DISCOVERY: "BACKLOG",
  PRIORITIZATION: "BACKLOG",
  PLANNED: "BACKLOG",
  UX: "UX_UI",
  DESIGN: "UX_UI",
  VALIDATION: "UX_UI",
  GO_LIVE: "AVAILABLE",
  POST_GO_LIVE: "AVAILABLE",
  PROBLEM: "AVAILABLE",
  NOT_AVAILABLE: "REMOVED",
  DISCONTINUED: "REMOVED",
};

/** Normaliza código legado/atual para etapa. */
export function normalizeFeatureStage(code: string): FeatureStage {
  if (code in featureStageLabel) return code as FeatureStage;
  return LEGACY_STAGE_MAP[code] ?? "BACKLOG";
}

/** @deprecated use normalizeFeatureStage */
export const normalizeFeatureStatus = normalizeFeatureStage;

export function phaseDisplayName(
  code: string,
  phases?: { code: string; name: string; symbol?: string }[],
): string {
  const fromCatalog = phases?.find((p) => p.code === code);
  if (fromCatalog) return fromCatalog.name;
  return featureStageLabel[normalizeFeatureStage(code)];
}

export function normalizeDeadlineStatus(code: string): FeatureStatus {
  if (code in featureStatusLabel) return code as FeatureStatus;
  return "NO_DEADLINE";
}

/** Calcula status de prazo a partir da data prevista. */
export function deriveDeadlineStatus(
  expectedDate: string | null | undefined,
  stage?: string | null,
): FeatureStatus {
  if (stage === "AVAILABLE" || stage === "REMOVED") return "ON_TRACK";
  if (!expectedDate) return "NO_DEADLINE";
  const day = expectedDate.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return day < today ? "DELAYED" : "ON_TRACK";
}

export const gapTypeLabel: Record<GapType, string> = {
  COVERAGE: "Gap de cobertura",
  EXPERIENCE: "Gap de experiência",
  CONSISTENCY: "Gap de consistência",
  INFORMATION: "Gap de informação",
  OPERATIONAL: "Gap operacional",
  TRANSITION: "Gap de transição",
};

export const gapStatusLabel: Record<GapStatus, string> = {
  OPEN: "Identificado",
  IN_PROGRESS: "Em tratamento",
  RESOLVED: "Concluído",
  DEFERRED: "Adiado",
  WONT_FIX: "Não será tratado",
};

export const evolutionStatusLabel: Record<
  import("@/types").EvolutionStatus,
  string
> = {
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
  PAUSED: "Pausada",
};

export const evolutionPhaseLabelMap: Record<
  import("@/types").EvolutionPhase,
  string
> = {
  BACKLOG: "Backlog",
  UX_UI: "UX/UI",
  DEVELOPMENT: "Em desenvolvimento",
  HOMOLOGATION: "Homologação",
  DONE: "Concluída",
};

export const EVOLUTION_PHASE_ORDER: import("@/types").EvolutionPhase[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "DONE",
];

/** Fases ativas no Kanban (concluída sai do board). */
export const EVOLUTION_BOARD_PHASES: import("@/types").EvolutionPhase[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
];

export function evolutionPhaseLabel(
  phase: import("@/types").EvolutionPhase | string,
): string {
  return (
    evolutionPhaseLabelMap[phase as import("@/types").EvolutionPhase] ??
    featureStageLabel[phase as FeatureStage] ??
    phase
  );
}

export function evolutionPhaseOptions(includeDone = false) {
  const phases = includeDone
    ? EVOLUTION_PHASE_ORDER
    : EVOLUTION_BOARD_PHASES;
  return phases.map((value) => ({
    value,
    label: evolutionPhaseLabel(value),
  }));
}

export function isEvolutionInProgress(e: {
  status: string;
  phase?: string;
}): boolean {
  if (e.status === "DONE" || e.status === "CANCELLED" || e.phase === "DONE") {
    return false;
  }
  return e.status === "IN_PROGRESS" || e.status === "PAUSED";
}

export const evidenceTypeLabel: Record<EvidenceType, string> = {
  UX_RESEARCH: "Pesquisa UX",
  INTERVIEW: "Entrevista",
  COMPLAINT: "Reclamação",
  ANALYTICS: "Analytics",
  HOTJAR: "Hotjar",
  MATOMO: "Matomo",
  SUPPORT: "Atendimento",
  CX_JOURNEY: "Jornada CX",
  BENCHMARK: "Benchmark",
  INTERNAL_INSIGHT: "Insight interno",
  OTHER: "Outro",
};

export const DEVELOPMENT_STAGES: FeatureStage[] = [
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
];

export const PLANNED_STAGES: FeatureStage[] = ["BACKLOG"];

export const ACTIVE_PIPELINE_STAGES: FeatureStage[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "PAUSED",
  "AVAILABLE",
];

export const REMOVED_STAGES: FeatureStage[] = ["REMOVED"];
