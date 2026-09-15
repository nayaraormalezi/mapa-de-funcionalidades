"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { EditJourneysAudienceModal } from "@/app/jornadas/edit-journeys-audience-modal";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { gapStatusLabel, gapTypeLabel } from "@/lib/labels";
import { cn, formatPercent } from "@/lib/utils";
import type {
  AudienceCode,
  EvidenceType,
  FeatureMapRow,
  GapStatus,
  GapType,
  Priority,
  TemporalStatus,
} from "@/types";
import {
  Calendar,
  ChartNoAxesColumn,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Flag,
  Grid2x2,
  Home,
  Info,
  Lightbulb,
  MapPin,
  Monitor,
  PenLine,
  RefreshCw,
  Route,
  Search,
  Settings2,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

type JourneyStep = {
  id: string;
  stageId: string;
  audienceId: string;
  name: string;
  description: string;
  order: number;
  momentId: string;
};

type Need = {
  id: string;
  journeyId: string;
  name: string;
  description: string;
  priority: Priority;
};

type GapLite = {
  id: string;
  title: string;
  journeyId: string;
  status: GapStatus;
  type: GapType;
  priority: Priority;
  impact: Priority;
};

type EvidenceLite = {
  id: string;
  featureId: string;
  title: string;
  type: EvidenceType;
  date: string;
};

type TabId =
  | "overview"
  | "needs"
  | "features"
  | "channels"
  | "gaps"
  | "evidences";

type JourneyMeta = {
  icon: LucideIcon;
  longDescription: string;
  quote: string;
  insight: string;
};

const JOURNEY_META: Record<string, JourneyMeta> = {
  "jrn-descoberta": {
    icon: Search,
    longDescription:
      "Conhecer o consórcio e entender se ele atende à necessidade do cliente.",
    quote:
      "Quero entender o que é consórcio e se faz sentido para o meu objetivo.",
    insight:
      "Na descoberta, a clareza da oferta e a facilidade de comparação definem se o cliente segue na jornada.",
  },
  "jrn-consideracao": {
    icon: FileText,
    longDescription:
      "Avaliar e comparar opções para decidir com segurança.",
    quote:
      "Quero comparar condições, prazos e valores antes de decidir.",
    insight:
      "A consideração exige transparência de regras e simulações confiáveis entre canais.",
  },
  "jrn-contratacao": {
    icon: PenLine,
    longDescription: "Adquirir o consórcio de forma simples e digital.",
    quote:
      "Quero contratar de forma rápida, sem burocracia e com segurança.",
    insight:
      "A contratação digital reduz fricção, mas exige consistência entre canais atuais e futuros.",
  },
  "jrn-onboarding": {
    icon: User,
    longDescription: "Pós-compra inicial para ativar e orientar o cliente.",
    quote:
      "Quero entender os próximos passos depois de contratar meu consórcio.",
    insight:
      "O onboarding bem estruturado reduz dúvidas e antecipa o engajamento no acompanhamento.",
  },
  "jrn-acompanhamento": {
    icon: ChartNoAxesColumn,
    longDescription:
      "Gerenciar minha cota e acompanhar a evolução do meu consórcio.",
    quote:
      "Quero saber como está meu consórcio, acompanhar minhas parcelas, assembleias e ter todas as informações sempre que precisar.",
    insight:
      "O acompanhamento é uma das jornadas mais críticas para o cliente, com alta demanda por informações e oportunidades de melhoria na experiência digital.",
  },
  "jrn-lance": {
    icon: Trophy,
    longDescription: "Aumentar a chance de contemplação com lances.",
    quote:
      "Quero ofertar lance com confiança e acompanhar o resultado.",
    insight:
      "Lance concentra gaps de experiência em canais digitais e inconsistências entre apps.",
  },
  "jrn-contemplacao": {
    icon: Target,
    longDescription: "Receber o crédito e entender os próximos passos.",
    quote:
      "Quero saber se fui contemplado e o que preciso fazer em seguida.",
    insight:
      "Contemplação exige comunicação clara e alinhamento de status entre canais.",
  },
  "jrn-uso-credito": {
    icon: Home,
    longDescription: "Utilizar o crédito de forma acompanhada e segura.",
    quote:
      "Quero iniciar e acompanhar o uso do meu crédito sem fricção.",
    insight:
      "Uso do crédito ainda tem lacunas digitais relevantes, especialmente no SuperApp.",
  },
  "jrn-pos-uso": {
    icon: Calendar,
    longDescription: "Acompanhar a etapa após a utilização do crédito.",
    quote:
      "Quero acompanhar pendências e obrigações depois de usar o crédito.",
    insight:
      "Pós-uso é pouco explorado digitalmente e concentra oportunidades de orientação contínua.",
  },
  "jrn-encerramento": {
    icon: Flag,
    longDescription: "Finalizar o plano com clareza e segurança.",
    quote:
      "Quero encerrar meu plano entendendo taxas, documentos e próximos passos.",
    insight:
      "Encerramento bem desenhado reduz contatos operacionais e aumenta confiança na marca.",
  },
};

const DEFAULT_META: JourneyMeta = {
  icon: Route,
  longDescription: "Etapa da jornada do cliente.",
  quote: "Quero concluir esta etapa com clareza e autonomia.",
  insight:
    "Esta jornada concentra necessidades do usuário com oportunidades de melhoria na cobertura digital.",
};

function coverageBarClass(pct: number) {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function channelIcon(name: string, temporal: string): LucideIcon {
  if (temporal === "FUTURE" || /superapp/i.test(name)) return Sparkles;
  if (/área logada|area logada|portal|plataforma|web/i.test(name))
    return Monitor;
  return Smartphone;
}

export function JornadasClient({
  journeyStages,
  needs,
  gaps,
  evidences,
  rows,
  audiences,
  products,
}: {
  journeyStages: JourneyStep[];
  needs: Need[];
  gaps: GapLite[];
  evidences: EvidenceLite[];
  rows: FeatureMapRow[];
  audiences: {
    id: string;
    name: string;
    code: AudienceCode;
    description?: string;
  }[];
  products: string[];
}) {
  const defaultAudience =
    audiences.find((a) => a.code === "CLIENT" || /cliente/i.test(a.name))
      ?.id ??
    audiences[0]?.id ??
    "";

  const [audienceId, setAudienceId] = useState(defaultAudience);
  const [product, setProduct] = useState("");
  const [temporal, setTemporal] = useState<"" | TemporalStatus>("");
  const [tab, setTab] = useState<TabId>("overview");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [expandedNeedId, setExpandedNeedId] = useState<string | null>(null);

  const journeys = useMemo(
    () =>
      journeyStages
        .filter((s) => s.audienceId === audienceId)
        .sort((a, b) => a.order - b.order),
    [journeyStages, audienceId],
  );

  const defaultJourney =
    journeys.find((j) => j.id === "jrn-acompanhamento")?.id ??
    journeys[0]?.id ??
    "";

  const [journeyId, setJourneyId] = useState(defaultJourney);

  // Keep selected stage valid when audience changes
  const resolvedJourneyId = journeys.some((j) => j.id === journeyId)
    ? journeyId
    : defaultJourney;

  const journey =
    journeys.find((j) => j.id === resolvedJourneyId) ?? journeys[0];
  const meta = JOURNEY_META[journey?.id ?? ""] ?? DEFAULT_META;
  const JourneyIcon = meta.icon;

  const journeyNeeds = useMemo(
    () => needs.filter((n) => n.journeyId === journey?.id),
    [needs, journey?.id],
  );

  const journeyRows = useMemo(() => {
    let scoped = rows.filter((r) => r.journeyId === journey?.id);
    if (audienceId) scoped = scoped.filter((r) => r.audienceId === audienceId);
    if (product) scoped = scoped.filter((r) => r.product === product);
    if (temporal)
      scoped = scoped.filter((r) => r.temporalStatus === temporal);
    return scoped;
  }, [rows, journey?.id, audienceId, product, temporal]);

  const featureIds = useMemo(
    () => new Set(journeyRows.map((r) => r.featureId)),
    [journeyRows],
  );

  const journeyGaps = useMemo(
    () => gaps.filter((g) => g.journeyId === journey?.id),
    [gaps, journey?.id],
  );

  const journeyEvidences = useMemo(() => {
    return evidences.filter((e) => featureIds.has(e.featureId));
  }, [evidences, featureIds]);

  const coverageByChannel = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        temporal: string;
        total: Set<string>;
        available: Set<string>;
      }
    >();
    for (const row of journeyRows) {
      const entry = map.get(row.channelId) ?? {
        name: row.channelName,
        temporal: row.temporalStatus,
        total: new Set<string>(),
        available: new Set<string>(),
      };
      entry.total.add(row.featureId);
      if (row.status === "AVAILABLE") entry.available.add(row.featureId);
      map.set(row.channelId, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        name: v.name,
        temporal: v.temporal,
        total: v.total.size,
        available: v.available.size,
        percentage:
          v.total.size === 0 ? 0 : (v.available.size / v.total.size) * 100,
      }))
      .sort((a, b) => {
        const ao = a.temporal === "FUTURE" ? 1 : 0;
        const bo = b.temporal === "FUTURE" ? 1 : 0;
        return ao - bo || b.percentage - a.percentage;
      });
  }, [journeyRows]);

  const needsWithCoverage = useMemo(() => {
    return journeyNeeds.map((need) => {
      const needRows = journeyRows.filter((r) => r.userNeedId === need.id);
      const featuresMap = new Map<
        string,
        {
          featureId: string;
          featureName: string;
          status: FeatureMapRow["status"];
          channels: string[];
        }
      >();
      for (const row of needRows) {
        const existing = featuresMap.get(row.featureId);
        if (existing) {
          if (!existing.channels.includes(row.channelName)) {
            existing.channels.push(row.channelName);
          }
        } else {
          featuresMap.set(row.featureId, {
            featureId: row.featureId,
            featureName: row.featureName,
            status: row.status,
            channels: [row.channelName],
          });
        }
      }
      const features = Array.from(featuresMap.values()).sort((a, b) =>
        a.featureName.localeCompare(b.featureName, "pt-BR"),
      );
      const total = features.length;
      const available = features.filter((f) => f.status === "AVAILABLE").length;
      const pct = total === 0 ? 0 : (available / total) * 100;
      return { need, total, available, pct, features };
    });
  }, [journeyNeeds, journeyRows]);

  const availableCount = useMemo(
    () =>
      new Set(
        journeyRows
          .filter((r) => r.status === "AVAILABLE")
          .map((r) => r.featureId),
      ).size,
    [journeyRows],
  );
  const inDevCount = useMemo(
    () =>
      new Set(
        journeyRows
          .filter((r) =>
            [
              "BACKLOG",
              "UX_UI",
              "DEVELOPMENT",
              "HOMOLOGATION",
              "PAUSED",
            ].includes(r.status),
          )
          .map((r) => r.featureId),
      ).size,
    [journeyRows],
  );

  const coveragePct =
    featureIds.size === 0 ? 0 : (availableCount / featureIds.size) * 100;
  const inDevPct =
    featureIds.size === 0 ? 0 : (inDevCount / featureIds.size) * 100;
  const gapsPct =
    featureIds.size === 0
      ? 0
      : (journeyGaps.length / Math.max(featureIds.size, 1)) * 100;

  const audienceName =
    audiences.find((a) => a.id === audienceId)?.name ?? "Todos";

  const tabs = [
    { id: "overview", label: "Visão geral" },
    { id: "needs", label: "Necessidades", count: journeyNeeds.length },
    { id: "features", label: "Funcionalidades", count: featureIds.size },
    { id: "channels", label: "Canais" },
    { id: "gaps", label: "Gaps", count: journeyGaps.length },
    { id: "evidences", label: "Evidências", count: journeyEvidences.length },
  ];

  function clearFilters() {
    setAudienceId(defaultAudience);
    setProduct("");
    setTemporal("");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Jornadas › Visão geral"
        title="Jornadas do cliente"
        description="Uma visão completa das necessidades, funcionalidades e cobertura por canal em cada etapa da experiência."
        actions={
          <Button size="sm" type="button" onClick={() => setEditModalOpen(true)}>
            <PenLine className="h-3.5 w-3.5" />
            Editar jornadas
          </Button>
        }
      />

      <EditJourneysAudienceModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        audiences={audiences}
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Público"
            value={audienceId}
            onChange={(id) => {
              setAudienceId(id);
              setJourneyId("");
              setTab("overview");
            }}
            options={audiences.map((a) => ({ value: a.id, label: a.name }))}
            className="min-w-[160px]"
          />
          <FilterSelect
            label="Produto"
            value={product}
            onChange={setProduct}
            options={[
              { value: "", label: "Todos" },
              ...products.map((p) => ({ value: p, label: p })),
            ]}
            className="min-w-[140px]"
          />
          <FilterSelect
            label="Situação do canal"
            value={temporal}
            onChange={(v) => setTemporal(v as "" | TemporalStatus)}
            options={[
              { value: "", label: "Todos" },
              { value: "CURRENT", label: "Atual" },
              { value: "FUTURE", label: "Em breve" },
            ]}
            className="min-w-[160px]"
          />
          <button
            type="button"
            onClick={clearFilters}
            className="mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4">
        <SectionTitle>Visão das jornadas</SectionTitle>
        {!journey ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhuma etapa cadastrada para {audienceName}. Use &quot;Editar
            jornadas&quot; para montar a jornada deste público.
          </p>
        ) : (
        <div className="flex gap-0 overflow-x-auto pb-1 scrollbar-thin">
          {journeys.map((j, index) => {
            const active = j.id === journey.id;
            const isLast = index === journeys.length - 1;
            const StepIcon = JOURNEY_META[j.id]?.icon ?? Route;
            return (
              <div key={j.stageId} className="flex min-w-0 items-stretch">
                <button
                  type="button"
                  onClick={() => {
                    setJourneyId(j.id);
                    setTab("overview");
                  }}
                  className={cn(
                    "flex w-[118px] shrink-0 flex-col items-center rounded-xl px-2.5 py-3 text-center transition-colors",
                    active
                      ? "bg-[var(--sidebar)] text-white shadow-[var(--shadow-sm)]"
                      : "bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "mb-2 flex h-9 w-9 items-center justify-center rounded-full",
                      active
                        ? "bg-white/15 text-white"
                        : "bg-[var(--brand-soft)] text-[var(--brand)]",
                    )}
                  >
                    <StepIcon className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      active ? "text-white/80" : "text-slate-500",
                    )}
                  >
                    {index + 1}. {j.name}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 line-clamp-2 text-[11px] leading-snug",
                      active ? "text-white/70" : "text-slate-500",
                    )}
                  >
                    {j.description || "Etapa da jornada"}
                  </span>
                </button>
                {!isLast ? (
                  <div className="flex w-6 shrink-0 items-center justify-center">
                    <div
                      className={cn(
                        "h-0.5 w-full rounded-full",
                        active ? "bg-[var(--sidebar)]/40" : "bg-slate-200",
                      )}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        )}
      </SurfaceCard>

      {journey ? (
      <SurfaceCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                <JourneyIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {journey.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {meta.longDescription}
                </p>
              </div>
            </div>
          </div>
          <div className="relative max-w-md rounded-2xl border border-[#cfe3f5] bg-[#e8f1fa] px-4 py-3 text-sm leading-relaxed text-[#0f3d6e] italic">
            <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-b border-l border-[#cfe3f5] bg-[#e8f1fa]" />
            &quot;{meta.quote}&quot;
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-b border-[var(--border)] pb-0 lg:flex-row lg:items-center lg:justify-between">
          <UnderlineTabs
            className="border-b-0"
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            options={tabs}
          />
          <Link
            href={`/jornadas/editar?publico=${audienceId}`}
            className="mb-2 shrink-0 text-sm font-medium text-[var(--brand)] hover:underline lg:mb-3"
          >
            Editar esta jornada
          </Link>
        </div>

        <div className="mt-5">
          {tab === "overview" ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiTile
                  icon={ClipboardList}
                  value={journeyNeeds.length}
                  label="Necessidades"
                  hint="O que o cliente precisa fazer nesta jornada"
                  tone="brand"
                />
                <KpiTile
                  icon={Grid2x2}
                  value={featureIds.size}
                  label="Funcionalidades"
                  hint="Total de funcionalidades relacionadas"
                  tone="slate"
                />
                <KpiTile
                  icon={CheckCircle2}
                  value={availableCount}
                  label="Disponíveis"
                  hint={`${formatPercent(coveragePct)} de cobertura`}
                  tone="success"
                  bar={coveragePct}
                />
                <KpiTile
                  icon={Settings2}
                  value={inDevCount}
                  label="Em desenvolvimento"
                  hint={`${formatPercent(inDevPct)} de cobertura`}
                  tone="warning"
                  bar={inDevPct}
                />
                <KpiTile
                  icon={ShieldAlert}
                  value={journeyGaps.length}
                  label="Gaps identificados"
                  hint={`${formatPercent(gapsPct)} de cobertura`}
                  tone="danger"
                  bar={gapsPct}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <SectionTitle
                    action={
                      <button
                        type="button"
                        onClick={() => setTab("needs")}
                        className="text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Ver todas →
                      </button>
                    }
                  >
                    Principais necessidades
                  </SectionTitle>
                  <div className="space-y-3">
                    {needsWithCoverage.slice(0, 6).map(({ need, total, pct }) => (
                      <div
                        key={need.id}
                        className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {need.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {total}{" "}
                                {total === 1
                                  ? "funcionalidade"
                                  : "funcionalidades"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 text-xs font-semibold tabular-nums",
                                pct >= 70
                                  ? "text-emerald-600"
                                  : pct >= 40
                                    ? "text-amber-600"
                                    : "text-rose-600",
                              )}
                            >
                              {formatPercent(pct)}
                            </span>
                          </div>
                          <ProgressBar
                            value={pct}
                            barClassName={coverageBarClass(pct)}
                          />
                        </div>
                      </div>
                    ))}
                    {needsWithCoverage.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Nenhuma necessidade nesta jornada.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <SectionTitle
                    action={
                      <button
                        type="button"
                        onClick={() => setTab("channels")}
                        className="text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Ver detalhes →
                      </button>
                    }
                  >
                    Cobertura por canal
                    <span className="ml-1 font-normal text-slate-400">
                      ({audienceName} – {journey.name})
                    </span>
                  </SectionTitle>
                  <div className="space-y-3">
                    {coverageByChannel.map((ch) => {
                      const Icon = channelIcon(ch.name, ch.temporal);
                      return (
                        <div
                          key={ch.id}
                          className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5"
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              ch.temporal === "FUTURE"
                                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "bg-[var(--brand-soft)] text-[var(--brand)]",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium text-slate-800">
                                {ch.temporal === "FUTURE"
                                  ? `${ch.name} (em breve)`
                                  : ch.name}
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-slate-600 tabular-nums">
                                {formatPercent(ch.percentage)}
                              </span>
                            </div>
                            <ProgressBar
                              value={ch.percentage}
                              barClassName={
                                ch.temporal === "FUTURE"
                                  ? "bg-[var(--accent)]"
                                  : "bg-[var(--brand)]"
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                    {coverageByChannel.length === 0 ? (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Sem funcionalidades nesta jornada com o filtro atual.
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-4 flex gap-2 rounded-lg bg-[var(--brand-soft)] px-3 py-2.5 text-xs text-[#0f3d6e]">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    O SuperApp concentrará as funcionalidades dos canais
                    atuais, proporcionando uma experiência mais simples e
                    integrada.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-[#fde8c8] bg-[#fffbeb] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-950">
                      Insights dessa jornada
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                      {meta.insight}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTab("evidences")}
                  className="shrink-0 text-xs font-medium text-amber-800 hover:underline"
                >
                  Ver insights →
                </button>
              </div>
            </div>
          ) : null}

          {tab === "needs" ? (
            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {needsWithCoverage.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted-foreground)]">
                  Nenhuma necessidade nesta jornada.
                </p>
              ) : (
                needsWithCoverage.map(
                  ({ need, total, available, pct, features }) => {
                    const open = expandedNeedId === need.id;
                    return (
                      <div key={need.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedNeedId(open ? null : need.id)
                          }
                          aria-expanded={open}
                          className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                                  open && "rotate-180 text-[var(--brand)]",
                                )}
                              />
                              <MapPin className="h-4 w-4 text-[var(--brand)]" />
                              <p className="text-sm font-medium text-slate-900">
                                {need.name}
                              </p>
                              <PriorityBadge priority={need.priority} />
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
                                {total}{" "}
                                {total === 1
                                  ? "funcionalidade"
                                  : "funcionalidades"}
                              </span>
                            </div>
                            <p className="mt-1 pl-6 text-xs text-[var(--muted-foreground)]">
                              {need.description || "Sem descrição."}
                            </p>
                          </div>
                          <div className="w-full sm:w-44">
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-slate-500">Cobertura</span>
                              <span className="font-semibold tabular-nums text-slate-800">
                                {formatPercent(pct)}
                              </span>
                            </div>
                            <ProgressBar
                              value={pct}
                              barClassName={coverageBarClass(pct)}
                            />
                            <p className="mt-1 text-[10px] text-slate-400">
                              {available} de {total} disponíveis
                            </p>
                          </div>
                        </button>

                        {open ? (
                          <div className="border-t border-[var(--border)] bg-slate-50/70 px-4 py-3">
                            {features.length === 0 ? (
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Nenhuma funcionalidade atribuída a esta
                                necessidade nos filtros atuais.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {features.map((feature) => (
                                  <li
                                    key={feature.featureId}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <Link
                                        href={`/funcionalidades/${feature.featureId}`}
                                        className="text-sm font-medium text-[var(--brand)] hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {feature.featureName}
                                      </Link>
                                      {feature.channels.length > 0 ? (
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                          {feature.channels.join(" · ")}
                                        </p>
                                      ) : null}
                                    </div>
                                    <StatusBadge status={feature.status} />
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                )
              )}
            </div>
          ) : null}

          {tab === "features" ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                  <tr>
                    <th className="px-4 py-3">Funcionalidade</th>
                    <th className="px-4 py-3">Necessidade</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {journeyRows.map((row) => (
                    <tr
                      key={row.featureChannelContextId}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/funcionalidades/${row.featureId}`}
                          className="font-medium text-[var(--brand)] hover:underline"
                        >
                          {row.featureName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {row.userNeedName}
                      </td>
                      <td className="px-4 py-3">{row.channelName}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {journeyRows.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted-foreground)]">
                  Nenhuma funcionalidade encontrada.
                </p>
              ) : null}
            </div>
          ) : null}

          {tab === "channels" ? (
            <div className="space-y-3">
              {coverageByChannel.map((ch) => {
                const Icon = channelIcon(ch.name, ch.temporal);
                return (
                  <div
                    key={ch.id}
                    className="rounded-xl border border-[var(--border)] px-4 py-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Icon className="h-4 w-4 text-[var(--brand)]" />
                        {ch.temporal === "FUTURE"
                          ? `${ch.name} (em breve)`
                          : ch.name}
                      </p>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {ch.available}/{ch.total} ·{" "}
                        {formatPercent(ch.percentage)}
                      </span>
                    </div>
                    <ProgressBar value={ch.percentage} />
                  </div>
                );
              })}
            </div>
          ) : null}

          {tab === "gaps" ? (
            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {journeyGaps.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted-foreground)]">
                  Nenhum gap associado a esta jornada.
                </p>
              ) : (
                journeyGaps.map((gap) => (
                  <Link
                    key={gap.id}
                    href={`/gaps/${gap.id}`}
                    className="flex items-start justify-between gap-3 p-4 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {gap.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {gapTypeLabel[gap.type]} · {gapStatusLabel[gap.status]}
                      </p>
                    </div>
                    <PriorityBadge priority={gap.priority} />
                  </Link>
                ))
              )}
            </div>
          ) : null}

          {tab === "evidences" ? (
            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {journeyEvidences.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted-foreground)]">
                  Nenhuma evidência vinculada às funcionalidades desta jornada.
                </p>
              ) : (
                journeyEvidences.map((ev) => (
                  <div key={ev.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {ev.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {ev.type} · {ev.date}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </SurfaceCard>
      ) : null}
    </div>
  );
}

function KpiTile({
  icon: Icon,
  value,
  label,
  hint,
  tone,
  bar,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  hint: string;
  tone: "brand" | "slate" | "success" | "warning" | "danger";
  bar?: number;
}) {
  const tones = {
    brand: {
      icon: "bg-[var(--brand-soft)] text-[var(--brand)]",
      bar: "bg-[var(--brand)]",
    },
    slate: {
      icon: "bg-slate-100 text-slate-600",
      bar: "bg-slate-400",
    },
    success: {
      icon: "bg-emerald-50 text-emerald-600",
      bar: "bg-emerald-500",
    },
    warning: {
      icon: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
    },
    danger: {
      icon: "bg-rose-50 text-rose-600",
      bar: "bg-rose-500",
    },
  }[tone];

  return (
    <SurfaceCard className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">
            {value}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-800">{label}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tones.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {typeof bar === "number" ? (
        <ProgressBar
          value={bar}
          className="mt-3 h-1.5"
          barClassName={tones.bar}
        />
      ) : null}
    </SurfaceCard>
  );
}
