"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveRecord,
  upsertFeatureChannelContext,
  type ActionResult,
} from "@/app/actions/crud";
import { useAuth } from "@/components/auth/auth-provider";
import { StageBadge } from "@/components/badges/stage-badge";
import {
  ChannelAssessmentsTab,
  HealthGlance,
  type EvaluationLaunchRequest,
} from "@/components/feature/channel-intelligence";
import { FeatureComments } from "@/components/feature/feature-comments";
import { FeatureUserProfilesPanel } from "@/components/feature/feature-user-profiles-panel";
import {
  ContextEditModal,
  EvidenceEditModal,
  EvolutionEditModal,
  FeatureEditModal,
  IssueEditModal,
  ImplementationEditModal,
} from "@/components/feature/feature-sheet-modals";
import {
  FeatureSignalsSection,
  type FeatureOpportunityRow,
  type FeatureStaleUpdate,
} from "@/components/feature/feature-signals";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { UnderlineTabs, PageBreadcrumb } from "@/components/ui/prototype";
import type { Opportunity } from "@/lib/evaluation-intelligence";
import { buildChannelIntelligence } from "@/lib/evaluation-intelligence";
import { detectCoverageGaps } from "@/lib/coverage-gaps";
import type { DetectedCoverageGap } from "@/lib/coverage-gaps";
import { aggregateFeatureHealth, SIGNAL_LABEL } from "@/lib/health";
import {
  CONCEPT_LABEL,
  evidenceTypeLabel,
  evolutionPhaseLabel,
  evolutionStatusLabel,
  priorityLabel,
} from "@/lib/labels";
import { formatApplicabilityLabel } from "@/lib/products";
import { cn, formatDate } from "@/lib/utils";
import { formatMonthYear } from "@/app/roadmap/roadmap-types";
import type {
  Evidence,
  EvolutionOrigin,
  Feature,
  FeatureChannelEvaluation,
  FeatureEvolution,
  FeatureMapRow,
  FeatureUserProfile,
  Gap,
  Journey,
  UserNeed,
} from "@/types";
import { evolutionOriginLabel } from "@/lib/evolution";
import {
  EVIDENCE_OWNER_LABEL,
  filterEmbeddedNotYetMaterialized,
  listEvaluationEmbeddedAttachments,
  resolveEvidenceOwner,
} from "@/lib/evidence";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  ImageIcon,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

type Option = { value: string; label: string };

type ChannelCard = {
  key: string;
  channelName: string;
  audienceName: string;
  momentName: string;
  temporalStatus: FeatureMapRow["temporalStatus"];
  phase: FeatureMapRow["phase"];
  responsible: string;
  expectedDate: string | null;
  launchDate: string | null;
  notes: string;
  products: { id: string; name: string; shortName: string }[];
  /** Implementações (FCC) deste card — um por produto. */
  implementations: {
    fccId: string;
    productId: string;
    shortName: string;
  }[];
  figmaUrl: string | null;
  experienceImageUrl: string | null;
  experienceUrl: string | null;
  ticketNumber: string | null;
  experience: FeatureMapRow["experience"];
  evaluationNotes: string;
  researchDate: string | null;
  researchFileName: string | null;
  researchFileUrl: string | null;
  needsEvolution: boolean;
  fccIds: string[];
  primaryContext: FeatureMapRow;
};

type SheetModalState =
  | { type: "feature" }
  | { type: "context" }
  | {
      type: "implementation";
      context?: FeatureMapRow | null;
      mode?: "full" | "figma" | "screenshot";
      implementations?: {
        fccId: string;
        productId: string;
        shortName: string;
      }[];
    }
  | {
      type: "evolution";
      evolution?: FeatureEvolution | null;
      defaults?: {
        featureChannelContextId?: string;
        phase?: string;
        title?: string;
        description?: string;
        channelLabel?: string;
        audienceName?: string;
        momentName?: string;
        channelName?: string;
        lockChannel?: boolean;
        origin?: EvolutionOrigin;
        implementations?: {
          fccId: string;
          productId: string;
          shortName: string;
        }[];
      };
    }
  | { type: "evidence"; evidence?: Evidence | null; evaluationId?: string; evaluationName?: string }
  | { type: "issue"; issue?: Gap | null }
  | null;

function cleanDescription(value: string): string {
  return value.replace(/^\[DEMO\]\s*/i, "").trim();
}

function groupChannelCards(contexts: FeatureMapRow[]): ChannelCard[] {
  const map = new Map<string, ChannelCard>();

  for (const row of contexts) {
    const key = [
      row.channelId,
      row.audienceId,
      row.momentId,
      row.phase,
      row.responsible,
      row.temporalStatus,
      row.figmaUrl ?? "",
      row.experienceImageUrl ?? "",
      row.experienceUrl ?? "",
      row.ticketNumber ?? "",
      row.experience,
      row.needsEvolution ? "1" : "0",
      row.researchFilePath ?? "",
    ].join("|");

    const existing = map.get(key);
    if (existing) {
      if (!existing.products.some((p) => p.id === row.productId)) {
        existing.products.push({
          id: row.productId,
          name: row.product,
          shortName: row.productShortName,
        });
      }
      if (!existing.implementations.some((i) => i.fccId === row.featureChannelContextId)) {
        existing.implementations.push({
          fccId: row.featureChannelContextId,
          productId: row.productId,
          shortName: row.productShortName,
        });
      }
      existing.fccIds.push(row.featureChannelContextId);
      continue;
    }

    map.set(key, {
      key,
      channelName: row.channelName,
      audienceName: row.audienceName,
      momentName: row.momentName,
      temporalStatus: row.temporalStatus,
      phase: row.phase,
      responsible: row.responsible,
      expectedDate: row.expectedDate,
      launchDate: row.launchDate,
      notes: row.notes,
      products: [
        {
          id: row.productId,
          name: row.product,
          shortName: row.productShortName,
        },
      ],
      implementations: [
        {
          fccId: row.featureChannelContextId,
          productId: row.productId,
          shortName: row.productShortName,
        },
      ],
      figmaUrl: row.figmaUrl ?? null,
      experienceImageUrl: row.experienceImageUrl ?? null,
      experienceUrl: row.experienceUrl ?? null,
      ticketNumber: row.ticketNumber ?? null,
      experience: row.experience,
      evaluationNotes: row.evaluationNotes ?? "",
      researchDate: row.researchDate ?? null,
      researchFileName: row.researchFileName ?? null,
      researchFileUrl: row.researchFileUrl ?? null,
      needsEvolution: Boolean(row.needsEvolution),
      fccIds: [row.featureChannelContextId],
      primaryContext: row,
    });
  }

  const phaseOrder = [
    "AVAILABLE",
    "HOMOLOGATION",
    "DEVELOPMENT",
    "UX_UI",
    "BACKLOG",
    "PAUSED",
    "REMOVED",
  ];

  return Array.from(map.values()).sort((a, b) => {
    const ao = phaseOrder.indexOf(a.phase);
    const bo = phaseOrder.indexOf(b.phase);
    return (
      (ao < 0 ? 99 : ao) - (bo < 0 ? 99 : bo) ||
      a.channelName.localeCompare(b.channelName, "pt-BR")
    );
  });
}

export function FeatureSheet({
  feature,
  hierarchy,
  contexts,
  evolutions,
  evaluations = [],
  evidences,
  gaps,
  channelContextMatrix,
  productOptions,
  journeyOptions,
  needOptions,
  audienceOptions,
  momentOptions,
  channelOptions,
  userProfiles = [],
}: {
  feature: Feature;
  hierarchy: {
    journey?: Journey;
    userNeed?: UserNeed;
    journeys?: Journey[];
    userNeeds?: UserNeed[];
  };
  contexts: FeatureMapRow[];
  evolutions: FeatureEvolution[];
  evaluations?: FeatureChannelEvaluation[];
  evidences: Evidence[];
  gaps: Gap[];
  channelContextMatrix: {
    id: string;
    audienceId: string;
    momentId: string;
    channelId: string;
    temporalStatus: FeatureMapRow["temporalStatus"];
  }[];
  productOptions: Option[];
  journeyOptions: Option[];
  needOptions: Option[];
  audienceOptions: Option[];
  momentOptions: Option[];
  channelOptions: Option[];
  userProfiles?: FeatureUserProfile[];
}) {
  const { canEdit } = useAuth();
  const router = useRouter();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [modal, setModal] = useState<SheetModalState>(null);
  const [viewEvolution, setViewEvolution] = useState<{
    evolution: FeatureEvolution;
    channelName: string;
  } | null>(null);
  const [evalLaunch, setEvalLaunch] = useState<{
    channelContextId: string;
    request: EvaluationLaunchRequest;
  } | null>(null);
  const [, startTransition] = useTransition();

  const cards = useMemo(() => groupChannelCards(contexts), [contexts]);

  const productLabel = useMemo(() => {
    if (feature.productIds?.length) {
      return formatApplicabilityLabel(feature.productIds);
    }
    const fromContexts = Array.from(
      new Set(contexts.map((c) => c.productShortName)),
    );
    if (fromContexts.length === 0) return formatApplicabilityLabel([]);
    return fromContexts.join(" · ");
  }, [feature.productIds, contexts]);

  const audienceMomentLabel = useMemo(() => {
    const pairs = Array.from(
      new Set(contexts.map((c) => `${c.audienceName} · ${c.momentName}`)),
    );
    if (pairs.length === 0) return "—";
    if (pairs.length === 1) return pairs[0];
    return pairs.slice(0, 2).join(" · ") + (pairs.length > 2 ? "…" : "");
  }, [contexts]);

  const journeyLabel =
    hierarchy.journeys?.map((j) => j.name).filter(Boolean).join(", ") ||
    hierarchy.journey?.name ||
    contexts[0]?.journeyName ||
    "—";

  const needLabel =
    hierarchy.userNeeds?.map((n) => n.name).filter(Boolean).join(", ") ||
    hierarchy.userNeed?.name ||
    contexts[0]?.userNeedName ||
    "—";

  const activeEvolutions = useMemo(
    () =>
      evolutions.filter(
        (e) =>
          e.active &&
          e.status !== "DONE" &&
          e.status !== "CANCELLED" &&
          e.phase !== "DONE",
      ),
    [evolutions],
  );

  const evolutionHistory = useMemo(
    () =>
      evolutions
        .filter(
          (e) =>
            e.active && (e.status === "DONE" || e.phase === "DONE"),
        )
        .sort((a, b) => {
          const da = a.completedDate ?? a.updatedAt ?? "";
          const db = b.completedDate ?? b.updatedAt ?? "";
          return db.localeCompare(da);
        }),
    [evolutions],
  );

  const evolutionsByFcc = useMemo(() => {
    const map = new Map<string, FeatureEvolution[]>();
    for (const evo of activeEvolutions) {
      const list = map.get(evo.featureChannelContextId) ?? [];
      list.push(evo);
      map.set(evo.featureChannelContextId, list);
    }
    return map;
  }, [activeEvolutions]);

  const evaluationsByChannelContext = useMemo(() => {
    const map = new Map<string, FeatureChannelEvaluation[]>();
    for (const ev of evaluations) {
      const list = map.get(ev.channelContextId) ?? [];
      list.push(ev);
      map.set(ev.channelContextId, list);
    }
    return map;
  }, [evaluations]);

  /** Evidências canônicas: Feature-owned + Evaluation-owned (sem dedup global por URL). */
  const sheetEvidences = useMemo(() => {
    const evaluationById = new Map(evaluations.map((e) => [e.id, e]));
    return evidences.map((e) => {
      const owner = resolveEvidenceOwner(e);
      const evaluation =
        owner?.ownerType === "EVALUATION"
          ? evaluationById.get(owner.ownerId)
          : undefined;
      return { evidence: e, owner, evaluation };
    });
  }, [evidences, evaluations]);

  /** Anexos embutidos ainda não materializados (evita duplicar na UI). */
  const evaluationEmbedded = useMemo(() => {
    const embedded = evaluations.flatMap((ev) =>
      listEvaluationEmbeddedAttachments(ev),
    );
    return filterEmbeddedNotYetMaterialized(embedded, evidences);
  }, [evaluations, evidences]);

  /** Uma passagem de inteligência por canal (saúde, oportunidades, stale). */
  const channelIntelByContext = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof buildChannelIntelligence>
    >();
    for (const card of cards) {
      const ctxId = card.primaryContext.channelContextId;
      const channelEvals = evaluationsByChannelContext.get(ctxId) ?? [];
      map.set(ctxId, buildChannelIntelligence(channelEvals));
    }
    return map;
  }, [cards, evaluationsByChannelContext]);

  /** Média da saúde apenas entre canais com evidências (ausência ≠ 0). */
  const featureHealth = useMemo(() => {
    const scores = cards.map((card) => {
      const intel = channelIntelByContext.get(
        card.primaryContext.channelContextId,
      );
      return intel?.healthScore ?? null;
    });
    return aggregateFeatureHealth(scores);
  }, [cards, channelIntelByContext]);

  /** Gaps de cobertura: canal associado em backlog ou sem previsão. */
  const coverageGaps = useMemo(() => detectCoverageGaps(cards), [cards]);

  /** Oportunidades: notas baixas agregadas por canal. */
  const featureOpportunities = useMemo(() => {
    const list: FeatureOpportunityRow[] = [];
    for (const card of cards) {
      const ctxId = card.primaryContext.channelContextId;
      const intel = channelIntelByContext.get(ctxId);
      if (!intel) continue;
      for (const opportunity of intel.opportunities) {
        list.push({
          channelName: card.channelName,
          channelContextId: ctxId,
          audienceName: card.audienceName,
          momentName: card.momentName,
          opportunity,
          fccId: card.primaryContext.featureChannelContextId,
        });
      }
    }
    return list;
  }, [cards, channelIntelByContext]);

  /** Atualizações: avaliações stale / NEEDS_UPDATE. */
  const staleUpdates = useMemo(() => {
    const list: FeatureStaleUpdate[] = [];
    for (const card of cards) {
      const ctxId = card.primaryContext.channelContextId;
      const intel = channelIntelByContext.get(ctxId);
      const channelEvals = evaluationsByChannelContext.get(ctxId) ?? [];
      if (!intel) continue;
      for (const method of intel.methods) {
        if (!method.stale) continue;
        list.push({
          evaluationId: method.evaluationId,
          channelContextId: ctxId,
          channelName: card.channelName,
          audienceName: card.audienceName,
          momentName: card.momentName,
          methodLabel: method.methodLabel,
          evaluatedAt: method.evaluatedAt,
          staleDays: method.staleDays,
          validityDays: method.validityDays,
          signalReason: method.signalReason,
          evaluation:
            channelEvals.find((e) => e.id === method.evaluationId) ?? null,
        });
      }
    }
    return list;
  }, [cards, channelIntelByContext, evaluationsByChannelContext]);

  const fccOptions = useMemo(
    () =>
      contexts.map((c) => ({
        value: c.featureChannelContextId,
        label: `${c.channelName} · ${c.productShortName}`,
      })),
    [contexts],
  );

  const description = cleanDescription(feature.description);
  const linkedIssues = gaps;

  function archiveItem(table: string, id: string) {
    if (!confirm("Confirma remover este item?")) return;
    startTransition(async () => {
      const result: ActionResult = await archiveRecord(table, id);
      if (result.ok) router.refresh();
      else alert(result.message);
    });
  }

  function openEvolutionFromOpportunity(row: FeatureOpportunityRow) {
    const card = cards.find(
      (c) => c.primaryContext.channelContextId === row.channelContextId,
    );
    if (!card) return;
    const opportunity = row.opportunity;
    setModal({
      type: "evolution",
      evolution: null,
      defaults: {
        origin: "OPPORTUNITY",
        phase: "BACKLOG",
        title: opportunity.title,
        description: [
          opportunity.summary,
          opportunity.evidence.length
            ? `Evidências: ${opportunity.evidence.join("; ")}`
            : null,
          opportunity.suggestion,
          `Origem: ${opportunity.origin}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        featureChannelContextId: row.fccId,
        channelLabel: `${card.audienceName} · ${card.momentName} · ${card.channelName}`,
        audienceName: card.audienceName,
        momentName: card.momentName,
        channelName: card.channelName,
        lockChannel: true,
        implementations: card.implementations,
      },
    });
  }

  function openEvolutionFromGap(gap: DetectedCoverageGap) {
    const card = cards.find(
      (c) => c.primaryContext.featureChannelContextId === gap.fccId,
    );
    if (!card) return;
    setModal({
      type: "evolution",
      evolution: null,
      defaults: {
        origin: "COVERAGE_GAP",
        phase: "BACKLOG",
        title: gap.title,
        description: gap.description,
        featureChannelContextId: gap.fccId,
        channelLabel: `${card.audienceName} · ${card.momentName} · ${card.channelName}`,
        audienceName: card.audienceName,
        momentName: card.momentName,
        channelName: card.channelName,
        lockChannel: true,
        implementations: card.implementations,
      },
    });
  }

  function openEvolutionFromIssue(issue: Gap) {
    const card =
      cards.find((c) =>
        issue.currentChannelId
          ? c.primaryContext.channelId === issue.currentChannelId
          : true,
      ) ?? cards[0];
    setModal({
      type: "evolution",
      evolution: null,
      defaults: {
        origin: "ISSUE",
        phase: "BACKLOG",
        title: issue.title,
        description: [
          issue.description,
          issue.actionPlan ? `Plano: ${issue.actionPlan}` : null,
          `Origem: ${CONCEPT_LABEL.problema} ${issue.id}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        featureChannelContextId: card?.primaryContext.featureChannelContextId,
        channelLabel: card
          ? `${card.audienceName} · ${card.momentName} · ${card.channelName}`
          : undefined,
        audienceName: card?.audienceName,
        momentName: card?.momentName,
        channelName: card?.channelName,
        lockChannel: Boolean(card),
        implementations: card?.implementations,
      },
    });
  }

  function viewImplementation(gap: DetectedCoverageGap) {
    const el = document.getElementById(`canal-${gap.channelContextId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function launchEvaluation(
    channelContextId: string,
    request: EvaluationLaunchRequest,
  ) {
    setEvalLaunch({
      channelContextId,
      request: { ...request, nonce: Date.now() },
    });
    const el = document.getElementById(`canal-${channelContextId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function duplicateImplementation(row: FeatureMapRow) {
    const fd = new FormData();
    fd.set("feature_id", feature.id);
    fd.set("channel_context_id", row.channelContextId);
    fd.set("product_id", row.productId);
    fd.set("phase", row.phase);
    fd.set("experience", row.experience);
    fd.set("responsible", row.responsible);
    if (row.expectedDate) fd.set("expected_date", row.expectedDate.slice(0, 10));
    if (row.launchDate) fd.set("launch_date", row.launchDate.slice(0, 10));
    if (row.startDate) fd.set("start_date", row.startDate.slice(0, 10));
    fd.set("notes", row.notes || "");
    if (row.figmaUrl) fd.set("figma_url", row.figmaUrl);
    if (row.experienceImageUrl)
      fd.set("experience_image_url", row.experienceImageUrl);
    if (row.experienceUrl) fd.set("experience_url", row.experienceUrl);
    fd.set("ticket_number", row.ticketNumber ?? "");
    startTransition(async () => {
      const result = await upsertFeatureChannelContext(fd);
      if (result.ok) router.refresh();
      else alert(result.message);
    });
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PageBreadcrumb
              items={[
                { label: "Funcionalidades", href: "/mapa" },
                { label: feature.name },
              ]}
            />
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-900">
              {feature.name}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-2 sm:gap-3">
            <FeatureHealthSummary health={featureHealth} />
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModal({ type: "feature" })}
              >
                Editar
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {/* CONTEXTO */}
      <section className="rounded-xl border border-[var(--border)] bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
            Contexto
          </h2>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-600"
              onClick={() => setModal({ type: "context" })}
            >
              Editar
            </Button>
          ) : null}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Jornada" value={journeyLabel} />
          <Meta label="Necessidade" value={needLabel} />
          <Meta label="Produto" value={productLabel} />
          <Meta label="Público" value={audienceMomentLabel} />
        </dl>
      </section>

      <FeatureUserProfilesPanel
        featureId={feature.id}
        initialProfiles={userProfiles}
        canEdit={canEdit}
      />

      {/* DISPONIBILIDADE POR CANAL */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Disponibilidade por canal
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Veja onde a funcionalidade está disponível, acompanhe o status e
              acesse a experiência de cada implementação.
            </p>
          </div>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() =>
                setModal({ type: "implementation", context: null, mode: "full" })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar canal
            </Button>
          ) : null}
        </div>

        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhuma implementação cadastrada para esta funcionalidade.
          </p>
        ) : (
          <ChannelCardsRow
            cards={cards}
            evolutionsByFcc={evolutionsByFcc}
            evidences={evidences}
            canEdit={canEdit}
            onOpenImage={setLightboxSrc}
            onViewEvolution={(evolution, channelName) =>
              setViewEvolution({ evolution, channelName })
            }
            onEdit={(card) =>
              setModal({
                type: "implementation",
                context: card.primaryContext,
                mode: "full",
                implementations: card.implementations,
              })
            }
            onAddFigma={(ctx) =>
              setModal({
                type: "implementation",
                context: ctx,
                mode: "figma",
              })
            }
            onAddScreenshot={(ctx) =>
              setModal({
                type: "implementation",
                context: ctx,
                mode: "screenshot",
              })
            }
            onDuplicate={duplicateImplementation}
            onRemove={(id) => archiveItem("feature_channel_contexts", id)}
            evaluationsByChannelContext={evaluationsByChannelContext}
            featureId={feature.id}
            evalLaunch={evalLaunch}
            onAddEvidence={(evaluation) =>
              setModal({
                type: "evidence",
                evidence: null,
                evaluationId: evaluation.id,
                evaluationName: evaluation.name,
              })
            }
            onCreateEvolution={(card, opportunity) =>
              setModal({
                type: "evolution",
                evolution: null,
                defaults: {
                  origin: opportunity ? "OPPORTUNITY" : "MANUAL",
                  featureChannelContextId:
                    card.primaryContext.featureChannelContextId,
                  phase: "BACKLOG",
                  title:
                    opportunity?.title ??
                    `Evolução · ${card.channelName}`,
                  description: opportunity
                    ? [
                        opportunity.summary,
                        "",
                        "Evidências:",
                        ...opportunity.evidence.map((e) => `· ${e}`),
                        "",
                        `Recomendação: ${opportunity.suggestion}`,
                        `Origem: ${opportunity.origin}`,
                      ].join("\n")
                    : undefined,
                  channelLabel: `${card.audienceName} · ${card.momentName} · ${card.channelName}`,
                  audienceName: card.audienceName,
                  momentName: card.momentName,
                  channelName: card.channelName,
                  lockChannel: true,
                  implementations: card.implementations,
                },
              })
            }
          />
        )}
      </section>

      {/* SINAIS — Gaps | Oportunidades | Issues | Atualizações */}
      <FeatureSignalsSection
        coverageGaps={coverageGaps}
        opportunities={featureOpportunities}
        issues={linkedIssues}
        updates={staleUpdates}
        canEdit={canEdit}
        cleanDescription={cleanDescription}
        onViewImplementation={viewImplementation}
        onCreateEvolutionFromGap={openEvolutionFromGap}
        onCreateEvolutionFromOpportunity={openEvolutionFromOpportunity}
        onCreateEvolutionFromIssue={openEvolutionFromIssue}
        onViewEvaluation={(channelContextId, evaluationId) =>
          launchEvaluation(channelContextId, {
            mode: "view",
            evaluationId,
          })
        }
        onStartNewEvaluation={(update) =>
          launchEvaluation(update.channelContextId, {
            mode: "duplicate",
            evaluationId: update.evaluationId,
          })
        }
        onAddIssue={() => setModal({ type: "issue", issue: null })}
        onEditIssue={(issue) => setModal({ type: "issue", issue })}
        onResolveIssue={(issue) =>
          setModal({
            type: "issue",
            issue: { ...issue, status: "RESOLVED" },
          })
        }
      />

      {/* EVOLUÇÕES */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Evoluções</h2>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() =>
                setModal({
                  type: "evolution",
                  evolution: null,
                  defaults: { origin: "MANUAL" },
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar evolução
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Em andamento
          </h3>
          {activeEvolutions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma evolução em andamento.
            </p>
          ) : (
            <div className="space-y-3">
              {activeEvolutions.map((evo) => {
                const ctx = contexts.find(
                  (c) =>
                    c.featureChannelContextId === evo.featureChannelContextId,
                );
                return (
                  <div
                    key={evo.id}
                    className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {evo.title}
                          </p>
                          {canEdit ? (
                            <ActionMenu
                              items={[
                                {
                                  label: "Editar evolução",
                                  onSelect: () =>
                                    setModal({
                                      type: "evolution",
                                      evolution: evo,
                                    }),
                                },
                                {
                                  label: "Alterar status",
                                  onSelect: () =>
                                    setModal({
                                      type: "evolution",
                                      evolution: evo,
                                    }),
                                },
                                {
                                  label: "Remover",
                                  tone: "danger",
                                  onSelect: () =>
                                    archiveItem("feature_evolutions", evo.id),
                                },
                              ]}
                            />
                          ) : null}
                        </div>
                        {evo.description ? (
                          <p className="mt-1 text-sm text-slate-600">
                            {cleanDescription(evo.description)}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">
                          {evolutionPhaseLabel(evo.phase)} ·{" "}
                          {priorityLabel[evo.priority]}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Canal: {ctx?.channelName ?? "—"}
                          {" · "}
                          Previsão: {formatMonthYear(evo.expectedDate)}
                          {" · "}
                          Responsável: {evo.responsible || "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setViewEvolution({
                              evolution: evo,
                              channelName: ctx?.channelName ?? "Canal",
                            })
                          }
                          className="mt-2 text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          Mostrar detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Histórico de evoluções
            {evolutionHistory.length > 0
              ? ` · ${evolutionHistory.length}`
              : ""}
          </h3>
          {evolutionHistory.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma evolução concluída ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {evolutionHistory.map((evo) => {
                const ctx = contexts.find(
                  (c) =>
                    c.featureChannelContextId === evo.featureChannelContextId,
                );
                const concludedLabel = evo.completedDate
                  ? formatDate(evo.completedDate)
                  : null;
                return (
                  <li
                    key={evo.id}
                    className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-slate-50/60 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">
                          {evo.title}
                        </p>
                        <span className="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                          {evolutionStatusLabel.DONE}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Canal: {ctx?.channelName ?? "—"}
                        {concludedLabel
                          ? ` · Concluída em ${concludedLabel}`
                          : ""}
                        {evo.responsible
                          ? ` · Responsável: ${evo.responsible}`
                          : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setViewEvolution({
                            evolution: evo,
                            channelName: ctx?.channelName ?? "Canal",
                          })
                        }
                        className="mt-1.5 text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                      >
                        Mostrar detalhes
                      </button>
                    </div>
                    {canEdit ? (
                      <ActionMenu
                        items={[
                          {
                            label: "Editar",
                            onSelect: () =>
                              setModal({ type: "evolution", evolution: evo }),
                          },
                          {
                            label: "Remover",
                            tone: "danger",
                            onSelect: () =>
                              archiveItem("feature_evolutions", evo.id),
                          },
                        ]}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* EVIDÊNCIAS */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Evidências</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Artefatos da funcionalidade ou de uma avaliação específica — não
              são sinais.
            </p>
          </div>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setModal({ type: "evidence", evidence: null })}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar evidência
            </Button>
          ) : null}
        </div>
        {sheetEvidences.length === 0 && evaluationEmbedded.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma evidência cadastrada.
          </p>
        ) : (
          <ul className="space-y-2">
            {sheetEvidences.map(({ evidence: ev, owner, evaluation }) => {
              const openHref = ev.link || ev.fileUrl || null;
              const ownerLabel =
                owner?.ownerType === "EVALUATION"
                  ? `Avaliação${evaluation ? `: ${evaluation.name}` : ""}`
                  : owner
                    ? EVIDENCE_OWNER_LABEL[owner.ownerType]
                    : "Legado";
              return (
                <li
                  key={ev.id}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3"
                >
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {ev.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {evidenceTypeLabel[ev.type]}
                      {ev.date ? ` · ${formatDate(ev.date)}` : ""}
                      {" · "}
                      <span className="text-slate-600">{ownerLabel}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {owner?.ownerType === "EVALUATION" && evaluation ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          launchEvaluation(evaluation.channelContextId, {
                            mode: "view",
                            evaluationId: evaluation.id,
                          })
                        }
                      >
                        Mostrar avaliação
                      </Button>
                    ) : null}
                    {openHref ? (
                      <Button asChild variant="ghost" size="sm">
                        <a
                          href={openHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <ActionMenu
                        items={[
                          {
                            label: "Editar",
                            onSelect: () =>
                              setModal({
                                type: "evidence",
                                evidence: ev,
                                evaluationId: owner?.ownerType === "EVALUATION"
                                  ? owner.ownerId
                                  : undefined,
                                evaluationName: evaluation?.name,
                              }),
                          },
                          {
                            label: "Remover",
                            tone: "danger",
                            onSelect: () => archiveItem("evidences", ev.id),
                          },
                        ]}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
            {evaluationEmbedded.map((att) => (
              <li
                key={att.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] bg-slate-50/80 px-4 py-3"
              >
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {att.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    Anexo da avaliação: {att.evaluationName}
                    <span className="ml-1 text-[10px] uppercase text-slate-400">
                      (legado embutido)
                    </span>
                  </p>
                </div>
                {att.href ? (
                  <Button asChild variant="ghost" size="sm">
                    <a
                      href={att.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Abrir
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <FeatureComments featureId={feature.id} />

      {lightboxSrc ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70"
            aria-label="Fechar imagem"
            onClick={() => setLightboxSrc(null)}
          />
          <div className="relative z-[91] max-h-[90vh] max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute top-3 right-3 rounded-lg bg-white/90 p-2 text-slate-600 shadow hover:bg-white"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt="Experiência ampliada"
              className="max-h-[90vh] w-full object-contain"
            />
          </div>
        </div>
      ) : null}

      {viewEvolution ? (
        <EvolutionViewModal
          evolution={viewEvolution.evolution}
          channelName={viewEvolution.channelName}
          onClose={() => setViewEvolution(null)}
          onEdit={
            canEdit
              ? () => {
                  const evo = viewEvolution.evolution;
                  setViewEvolution(null);
                  setModal({ type: "evolution", evolution: evo });
                }
              : undefined
          }
        />
      ) : null}

      {modal?.type === "feature" ? (
        <FeatureEditModal
          feature={feature}
          journeyOptions={journeyOptions}
          needOptions={needOptions}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.type === "context" ? (
        <ContextEditModal
          feature={feature}
          journeyOptions={journeyOptions}
          needOptions={needOptions}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.type === "implementation" ? (
        <ImplementationEditModal
          featureId={feature.id}
          context={modal.context}
          implementations={modal.implementations}
          channelContextMatrix={channelContextMatrix}
          audienceOptions={audienceOptions}
          momentOptions={momentOptions}
          channelOptions={channelOptions}
          productOptions={productOptions}
          mode={modal.mode ?? "full"}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.type === "evolution" ? (
        <EvolutionEditModal
          featureId={feature.id}
          evolution={modal.evolution}
          fccOptions={fccOptions}
          defaults={modal.defaults}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.type === "evidence" ? (
        <EvidenceEditModal
          featureId={feature.id}
          evidence={modal.evidence}
          evaluationId={modal.evaluationId}
          evaluationName={modal.evaluationName}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.type === "issue" ? (
        <IssueEditModal
          featureId={feature.id}
          issue={modal.issue}
          audienceOptions={audienceOptions}
          momentOptions={momentOptions}
          journeyOptions={journeyOptions}
          needOptions={needOptions}
          channelOptions={channelOptions}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}

function ChannelCardsRow({
  cards,
  evolutionsByFcc,
  evaluationsByChannelContext,
  evidences,
  featureId,
  canEdit,
  evalLaunch,
  onOpenImage,
  onViewEvolution,
  onEdit,
  onAddFigma,
  onAddScreenshot,
  onDuplicate,
  onRemove,
  onCreateEvolution,
  onAddEvidence,
}: {
  cards: ChannelCard[];
  evolutionsByFcc: Map<string, FeatureEvolution[]>;
  evaluationsByChannelContext: Map<string, FeatureChannelEvaluation[]>;
  evidences: Evidence[];
  featureId: string;
  canEdit: boolean;
  evalLaunch: {
    channelContextId: string;
    request: EvaluationLaunchRequest;
  } | null;
  onOpenImage: (src: string) => void;
  onViewEvolution: (evolution: FeatureEvolution, channelName: string) => void;
  onEdit: (card: ChannelCard) => void;
  onAddFigma: (ctx: FeatureMapRow) => void;
  onAddScreenshot: (ctx: FeatureMapRow) => void;
  onDuplicate: (ctx: FeatureMapRow) => void;
  onRemove: (id: string) => void;
  onCreateEvolution: (card: ChannelCard, opportunity?: Opportunity) => void;
  onAddEvidence: (evaluation: FeatureChannelEvaluation) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const useCarousel = cards.length > 4;

  function scrollByPage(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  function renderCard(card: ChannelCard) {
    const cardEvolutions = card.fccIds.flatMap(
      (id) => evolutionsByFcc.get(id) ?? [],
    );
    const ctxId = card.primaryContext.channelContextId;
    const launchForCard =
      evalLaunch?.channelContextId === ctxId ? evalLaunch.request : null;
    return (
      <ChannelAvailabilityCard
        key={card.key}
        card={card}
        evolutions={cardEvolutions}
        evaluations={evaluationsByChannelContext.get(ctxId) ?? []}
        evidences={evidences}
        featureId={featureId}
        canEdit={canEdit}
        launchRequest={launchForCard}
        onOpenImage={onOpenImage}
        onViewEvolution={onViewEvolution}
        onEdit={() => onEdit(card)}
        onAddFigma={() => onAddFigma(card.primaryContext)}
        onAddScreenshot={() => onAddScreenshot(card.primaryContext)}
        onDuplicate={() => onDuplicate(card.primaryContext)}
        onRemove={() =>
          onRemove(card.primaryContext.featureChannelContextId)
        }
        onCreateEvolution={(opportunity) => onCreateEvolution(card, opportunity)}
        onAddEvidence={onAddEvidence}
      />
    );
  }

  if (!useCarousel) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(renderCard)}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card) => (
          <div
            key={card.key}
            className="w-[min(100%,18.5rem)] shrink-0 snap-start xl:w-[calc((100%-3rem)/4)]"
          >
            {renderCard(card)}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Canais anteriores"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-600 hover:bg-slate-50"
          aria-label="Próximos canais"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TicketTiLine({ ticketNumber }: { ticketNumber: string | null }) {
  const [copied, setCopied] = useState(false);
  const value = ticketNumber?.trim() || null;

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponível — silencioso */
    }
  }

  if (!value) {
    return (
      <p>
        <span className="text-slate-500">Ticket TI</span>
        {" · "}
        Não informado
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-center gap-1.5">
      <span className="text-slate-500">Ticket TI</span>
      <span className="font-medium text-slate-800">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label={`Copiar ticket ${value}`}
      >
        <Copy className="h-3 w-3" />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </p>
  );
}

function ChannelAvailabilityCard({
  card,
  evolutions,
  evaluations,
  evidences,
  featureId,
  canEdit,
  launchRequest,
  onOpenImage,
  onViewEvolution,
  onEdit,
  onAddFigma,
  onAddScreenshot,
  onDuplicate,
  onRemove,
  onCreateEvolution,
  onAddEvidence,
}: {
  card: ChannelCard;
  evolutions: FeatureEvolution[];
  evaluations: FeatureChannelEvaluation[];
  evidences: Evidence[];
  featureId: string;
  canEdit: boolean;
  launchRequest?: EvaluationLaunchRequest | null;
  onOpenImage: (src: string) => void;
  onViewEvolution: (evolution: FeatureEvolution, channelName: string) => void;
  onEdit: () => void;
  onAddFigma: () => void;
  onAddScreenshot: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onCreateEvolution: (opportunity?: Opportunity) => void;
  onAddEvidence: (evaluation: FeatureChannelEvaluation) => void;
}) {
  const [tab, setTab] = useState<"tela" | "avaliacoes">("tela");
  const [seenLaunch, setSeenLaunch] = useState(launchRequest);
  if (launchRequest !== seenLaunch) {
    setSeenLaunch(launchRequest);
    if (launchRequest) setTab("avaliacoes");
  }
  const isAvailable = card.phase === "AVAILABLE";
  const showProductInline = card.products.length === 1;
  const productLine = card.products.map((p) => p.shortName).join(" · ");
  const hasImage = Boolean(card.experienceImageUrl);
  const primaryEvolution = evolutions[0] ?? null;

  const menuItems = [
    { label: "Editar implementação", onSelect: onEdit },
    { label: "Duplicar implementação", onSelect: onDuplicate },
    ...(!hasImage
      ? [{ label: "Adicionar imagem", onSelect: onAddScreenshot }]
      : []),
    ...(!card.figmaUrl
      ? [{ label: "Vincular Figma", onSelect: onAddFigma }]
      : []),
    {
      label: "Remover",
      tone: "danger" as const,
      onSelect: onRemove,
    },
  ];

  const assessmentsKey = launchRequest
    ? `launch-${launchRequest.mode}-${launchRequest.evaluationId ?? "new"}-${launchRequest.nonce ?? 0}`
    : "idle";

  return (
    <article
      id={`canal-${card.primaryContext.channelContextId}`}
      className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-white p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
            {card.channelName}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {card.audienceName} · {card.momentName}
            {card.temporalStatus === "FUTURE" ? " · Futuro" : ""}
            {showProductInline ? ` · ${productLine}` : ""}
          </p>
          {!showProductInline && card.products.length > 1 ? (
            <p className="mt-1 text-xs text-slate-500">
              Produtos: {productLine}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <StageBadge stage={card.phase} />
          {canEdit ? <ActionMenu items={menuItems} /> : null}
        </div>
      </div>

      <UnderlineTabs
        className="mt-3"
        options={[
          { id: "tela", label: "Tela" },
          {
            id: "avaliacoes",
            label: "Avaliações",
            count: evaluations.length > 0 ? evaluations.length : undefined,
          },
        ]}
        value={tab}
        onChange={(id) => setTab(id as "tela" | "avaliacoes")}
      />

      <HealthGlance evaluations={evaluations} />

      {tab === "tela" ? (
        <div className="mt-3 flex flex-1 flex-col">
          {primaryEvolution ? (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
                Em evolução · {evolutionPhaseLabel(primaryEvolution.phase)}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                {primaryEvolution.title}
              </p>
              <button
                type="button"
                onClick={() =>
                  onViewEvolution(primaryEvolution, card.channelName)
                }
                className="mt-1.5 text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline"
              >
                Mostrar o que está em evolução
              </button>
              {evolutions.length > 1 ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  +{evolutions.length - 1} outra(s) evolução(ões)
                </p>
              ) : null}
            </div>
          ) : null}

          {hasImage ? (
            <button
              type="button"
              onClick={() => onOpenImage(card.experienceImageUrl!)}
              className="mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-slate-50 text-left transition hover:opacity-95"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.experienceImageUrl!}
                alt={`Experiência em ${card.channelName}`}
                className="aspect-[16/10] w-full object-cover object-top"
              />
            </button>
          ) : (
            <div className="mt-3 flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-slate-50 text-slate-400">
              <ImageIcon className="h-7 w-7 opacity-40" />
              <p className="px-3 text-center text-xs">
                Visualização não disponível
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {hasImage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenImage(card.experienceImageUrl!)}
              >
                Mostrar imagem
              </Button>
            ) : canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onAddScreenshot}
              >
                Adicionar imagem
              </Button>
            ) : null}

            {card.experienceUrl ? (
              <Button asChild size="sm">
                <a
                  href={card.experienceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mostrar experiência
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}

            {card.figmaUrl ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={card.figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir no Figma
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onAddFigma}
              >
                Vincular Figma
              </Button>
            ) : null}
          </div>

          <div className="mt-auto space-y-1 border-t border-[var(--border)] pt-3 text-xs text-slate-600">
            {isAvailable && card.launchDate ? (
              <p>Disponível desde {formatDate(card.launchDate)}</p>
            ) : null}
            {!isAvailable && card.expectedDate ? (
              <p>Previsão: {formatMonthYear(card.expectedDate)}</p>
            ) : null}
            {card.responsible ? <p>Responsável: {card.responsible}</p> : null}
            <TicketTiLine ticketNumber={card.ticketNumber} />
            {(card.phase === "PAUSED" || card.phase === "REMOVED") &&
            card.notes &&
            !/^DEMO/i.test(card.notes) ? (
              <p>Motivo: {card.notes}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <ChannelAssessmentsTab
          key={assessmentsKey}
          featureId={featureId}
          channelContextId={card.primaryContext.channelContextId}
          primaryFccId={card.primaryContext.featureChannelContextId}
          channelName={card.channelName}
          evaluations={evaluations}
          evidences={evidences}
          canEdit={canEdit}
          onCreateEvolution={onCreateEvolution}
          launchRequest={launchRequest}
          onAddEvidence={onAddEvidence}
        />
      )}
    </article>
  );
}

function EvolutionViewModal({
  evolution,
  channelName,
  onClose,
  onEdit,
}: {
  evolution: FeatureEvolution;
  channelName: string;
  onClose: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evolution-view-title"
        className="relative z-[81] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Evolução em andamento
            </p>
            <h2
              id="evolution-view-title"
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              {evolution.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {evolution.description ? (
            <p className="text-sm leading-relaxed text-slate-600">
              {cleanDescription(evolution.description)}
            </p>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Origem
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {evolutionOriginLabel[
                  evolution.origin ?? "MANUAL"
                ]}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Canal
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">{channelName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Fase
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {evolutionPhaseLabel(evolution.phase)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Prioridade
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {priorityLabel[evolution.priority]}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Previsão
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {formatMonthYear(evolution.expectedDate)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                Responsável
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {evolution.responsible || "—"}
              </dd>
            </div>
            {evolution.measurement ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  Mensuração
                </dt>
                <dd className="mt-0.5 text-sm text-slate-800">
                  {evolution.measurement}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
          {onEdit ? (
            <Button type="button" size="sm" onClick={onEdit}>
              Editar evolução
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FeatureHealthSummary({
  health,
}: {
  health: {
    score: number | null;
    signal: keyof typeof SIGNAL_LABEL;
    scoredCount: number;
    totalChannels: number;
  };
}) {
  const signalColor =
    health.signal === "GOOD"
      ? "bg-emerald-500"
      : health.signal === "ATTENTION"
        ? "bg-amber-500"
        : health.signal === "CRITICAL"
          ? "bg-rose-500"
          : "bg-slate-300";

  if (health.score == null) {
    return (
      <div className="inline-flex flex-col gap-0.5 rounded-lg border border-[var(--border)] bg-white px-3 py-2">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          Saúde média da experiência
        </p>
        <p className="text-sm font-medium text-slate-700">
          Sem evidências suficientes
        </p>
        <p className="text-[11px] text-slate-500">
          A ausência de evidências não significa que exista um problema.
          {health.totalChannels > 0
            ? ` · ${health.totalChannels} canal${health.totalChannels === 1 ? "" : "is"} sem nota calculada`
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-0.5 rounded-lg border border-[var(--border)] bg-white px-3 py-2">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        Saúde média da experiência
      </p>
      <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-700">
        <span className="text-lg font-semibold tabular-nums text-slate-900">
          {health.score}
          <span className="text-xs font-medium text-slate-400">/100</span>
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span
            className={cn("inline-block h-1.5 w-1.5 rounded-full", signalColor)}
          />
          {SIGNAL_LABEL[health.signal]}
        </span>
      </p>
      <p className="text-[11px] text-slate-500">
        Média de {health.scoredCount} canal
        {health.scoredCount === 1 ? "" : "is"} com avaliação
        {health.totalChannels > health.scoredCount
          ? ` · ${health.totalChannels - health.scoredCount} sem evidências (não entram na média)`
          : ""}
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}
