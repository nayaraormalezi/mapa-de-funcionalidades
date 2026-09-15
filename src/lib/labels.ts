import type {
  EvidenceType,
  ExperienceLevel,
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

/** Status oficial da funcionalidade por canal (catálogo único). */
export const featureStatusLabel: Record<FeatureStatus, string> = {
  BACKLOG: "Backlog",
  UX_UI: "UX/UI",
  DEVELOPMENT: "Em desenvolvimento",
  HOMOLOGATION: "Homologação",
  PAUSED: "Pausado",
  REMOVED: "Removido",
  AVAILABLE: "Disponível",
};

/** Ordem oficial de exibição dos status. */
export const FEATURE_STATUS_ORDER: FeatureStatus[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "PAUSED",
  "REMOVED",
  "AVAILABLE",
];

/** Opções oficiais para selects/filtros — sempre nesta ordem. */
export function featureStatusOptions(): {
  value: FeatureStatus;
  label: string;
}[] {
  return FEATURE_STATUS_ORDER.map((value) => ({
    value,
    label: featureStatusLabel[value],
  }));
}

/** Catálogo oficial de status para roadmap/kanban. */
export function officialStatusCatalog(): {
  id: string;
  code: FeatureStatus;
  name: string;
  symbol: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}[] {
  return FEATURE_STATUS_ORDER.map((code, index) => ({
    id: `status-${code.toLowerCase()}`,
    code,
    name: featureStatusLabel[code],
    symbol: "",
    sortOrder: index + 1,
    active: true,
    createdAt: "",
    updatedAt: "",
  }));
}

export const featureStatusSymbol: Record<FeatureStatus, string> = {
  BACKLOG: "",
  UX_UI: "",
  DEVELOPMENT: "",
  HOMOLOGATION: "",
  PAUSED: "",
  REMOVED: "",
  AVAILABLE: "",
};

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

/** Alias legado — preferir featureStatusLabel / status. */
export const roadmapPhaseLabel: Record<string, string> = {
  ...featureStatusLabel,
};

export const roadmapPhaseSymbol: Record<string, string> = {
  ...featureStatusSymbol,
};

const LEGACY_STATUS_MAP: Record<string, FeatureStatus> = {
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

/** Normaliza status/fase legado para o catálogo unificado. */
export function normalizeFeatureStatus(code: string): FeatureStatus {
  if (code in featureStatusLabel) return code as FeatureStatus;
  return LEGACY_STATUS_MAP[code] ?? "BACKLOG";
}

export function phaseDisplayName(
  code: string,
  phases?: { code: string; name: string; symbol?: string }[],
): string {
  const fromCatalog = phases?.find((p) => p.code === code);
  if (fromCatalog) return fromCatalog.name;
  return featureStatusLabel[normalizeFeatureStatus(code)];
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

export const DEVELOPMENT_STATUSES: FeatureStatus[] = [
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
];

export const PLANNED_STATUSES: FeatureStatus[] = ["BACKLOG"];

export const ACTIVE_PIPELINE_STATUSES: FeatureStatus[] = [
  "BACKLOG",
  "UX_UI",
  "DEVELOPMENT",
  "HOMOLOGATION",
  "PAUSED",
  "AVAILABLE",
];

export const REMOVED_STATUSES: FeatureStatus[] = ["REMOVED"];
