"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { EditJourneysAudienceModal } from "@/app/jornadas/edit-journeys-audience-modal";
import { NovaFuncionalidadeModal } from "@/components/map/nova-funcionalidade-modal";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StageBadge } from "@/components/badges/stage-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import {
  archiveRecord,
  ensureJourneyStagesForAudiences,
  upsertUserNeed,
} from "@/app/actions/crud";
import { ApplicabilityLabel } from "@/components/shared/applicability-label";
import { MeasurementAndEvidenceFields } from "@/components/shared/measurement-and-evidence-fields";
import { ProductMultiSelect } from "@/components/shared/product-multi-select";
import { AudienceMultiSelect } from "@/components/shared/audience-multi-select";
import { useAuth } from "@/components/auth/auth-provider";
import { appliesToAudience } from "@/lib/audiences";
import { appliesToProduct, getProductMeta } from "@/lib/products";
import { CONCEPT_LABEL, gapStatusLabel, gapTypeLabel } from "@/lib/labels";
import { cn, formatPercent } from "@/lib/utils";
import type {
  AudienceCode,
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
  MapPin,
  Monitor,
  PenLine,
  Pencil,
  Plus,
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
  /** JourneyStage id (etapa selecionada). */
  id: string;
  stageId: string;
  catalogJourneyId?: string;
  audienceId: string;
  name: string;
  description: string;
  order: number;
  momentId: string;
};

type Need = {
  id: string;
  journeyId: string;
  journeyStageId?: string | null;
  name: string;
  description: string;
  measurement?: string;
  priority: Priority;
  productIds?: string[];
  audienceIds?: string[];
};

type GapLite = {
  id: string;
  title: string;
  journeyId: string;
  featureId?: string | null;
  status: GapStatus;
  type: GapType;
  priority: Priority;
  impact: Priority;
};

type TabId =
  | "overview"
  | "needs"
  | "features"
  | "products"
  | "channels"
  | "gaps";

type JourneyMeta = {
  icon: LucideIcon;
  longDescription: string;
  quote: string;
  insight: string;
};

const JOURNEY_META: Record<string, JourneyMeta> = {
  "js-jrn-descoberta": {
    icon: Search,
    longDescription:
      "Conhecer o consórcio e entender se ele atende à necessidade do cliente.",
    quote:
      "Quero entender o que é consórcio e se faz sentido para o meu objetivo.",
    insight:
      "Na descoberta, a clareza da oferta e a facilidade de comparação definem se o cliente segue na jornada.",
  },
  "js-jrn-consideracao": {
    icon: FileText,
    longDescription:
      "Avaliar e comparar opções para decidir com segurança.",
    quote:
      "Quero comparar condições, prazos e valores antes de decidir.",
    insight:
      "A consideração exige transparência de regras e simulações confiáveis entre canais.",
  },
  "js-jrn-contratacao": {
    icon: PenLine,
    longDescription: "Adquirir o consórcio de forma simples e digital.",
    quote:
      "Quero contratar de forma rápida, sem burocracia e com segurança.",
    insight:
      "A contratação digital reduz fricção, mas exige consistência entre canais atuais e futuros.",
  },
  "js-jrn-onboarding": {
    icon: User,
    longDescription: "Pós-compra inicial para ativar e orientar o cliente.",
    quote:
      "Quero entender os próximos passos depois de contratar meu consórcio.",
    insight:
      "O onboarding bem estruturado reduz dúvidas e antecipa o engajamento no acompanhamento.",
  },
  "js-jrn-acompanhamento": {
    icon: ChartNoAxesColumn,
    longDescription:
      "Gerenciar minha cota e acompanhar a evolução do meu consórcio.",
    quote:
      "Quero saber como está meu consórcio, acompanhar minhas parcelas, assembleias e ter todas as informações sempre que precisar.",
    insight:
      "O acompanhamento é uma das jornadas mais críticas para o cliente, com alta demanda por informações e oportunidades de melhoria na experiência digital.",
  },
  "js-jrn-lance": {
    icon: Trophy,
    longDescription:
      "Aumentar as chances de contemplação por meio de ofertas de lance.",
    quote:
      "Quero ofertar lance com confiança e acompanhar o resultado.",
    insight:
      "Lance concentra fricções de experiência em canais digitais e inconsistências entre apps.",
  },
  "js-jrn-contemplacao": {
    icon: Target,
    longDescription: "Receber o crédito e entender os próximos passos.",
    quote:
      "Quero saber se fui contemplado e o que preciso fazer em seguida.",
    insight:
      "Contemplação exige comunicação clara e alinhamento de status entre canais.",
  },
  "js-jrn-uso-credito": {
    icon: Home,
    longDescription: "Utilizar o crédito de forma acompanhada e segura.",
    quote:
      "Quero iniciar e acompanhar o uso do meu crédito sem fricção.",
    insight:
      "Uso do crédito ainda tem lacunas digitais relevantes, especialmente no SuperApp.",
  },
  "js-jrn-pos-uso": {
    icon: Calendar,
    longDescription: "Acompanhar a etapa após a utilização do crédito.",
    quote:
      "Quero acompanhar pendências e obrigações depois de usar o crédito.",
    insight:
      "Pós-uso é pouco explorado digitalmente e concentra oportunidades de orientação contínua.",
  },
  "js-jrn-encerramento": {
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
    "Esta etapa concentra necessidades do usuário com oportunidades de melhoria na cobertura digital.",
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
  rows,
  audiences,
  products,
  moments = [],
  journeysCatalog = [],
  channels = [],
  channelContexts = [],
  existingFeatures = [],
  initialJourneyId,
}: {
  journeyStages: JourneyStep[];
  needs: Need[];
  gaps: GapLite[];
  rows: FeatureMapRow[];
  audiences: {
    id: string;
    name: string;
    code: AudienceCode;
    description?: string;
  }[];
  products: { id: string; name: string }[];
  moments?: { value: string; label: string }[];
  journeysCatalog?: { value: string; label: string; momentIds: string[] }[];
  channels?: { value: string; label: string }[];
  channelContexts?: {
    audienceId: string;
    momentId: string;
    channelId: string;
  }[];
  existingFeatures?: { value: string; label: string; description?: string }[];
  initialJourneyId?: string;
}) {
  const router = useRouter();
  const { isAdmin, canEdit } = useAuth();
  const [pendingDelete, startDelete] = useTransition();
  const stageForInitial = initialJourneyId
    ? journeyStages.find((s) => s.id === initialJourneyId)
    : undefined;

  const defaultAudience =
    stageForInitial?.audienceId ??
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
  const [addFeatureOpen, setAddFeatureOpen] = useState(false);
  const [addNeedOpen, setAddNeedOpen] = useState(false);
  const [needAudienceIds, setNeedAudienceIds] = useState<string[]>([]);
  const [pendingMissingStages, setPendingMissingStages] = useState<
    string[] | null
  >(null);
  const [pendingEnsureStages, startEnsureStages] = useTransition();
  const needFormRef = useRef<HTMLFormElement>(null);
  const allowEnsureStagesRef = useRef(false);
  const [deleteNeed, setDeleteNeed] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [addFeatureInitial, setAddFeatureInitial] = useState<{
    audienceIds?: string[];
    momentId?: string;
    journeyId?: string;
    journeyStageId?: string;
    needId?: string;
    priority?: Priority;
    lockNeed?: boolean;
  }>({});

  const journeys = useMemo(
    () =>
      journeyStages
        .filter((s) => s.audienceId === audienceId)
        .sort((a, b) => a.order - b.order),
    [journeyStages, audienceId],
  );

  const defaultJourney =
    (initialJourneyId &&
      journeys.some((j) => j.id === initialJourneyId) &&
      initialJourneyId) ||
    journeys.find((j) => j.id === "js-jrn-acompanhamento")?.id ||
    journeys[0]?.id ||
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

  const journeyNeeds = useMemo(() => {
    return needs.filter((n) => {
      const stageMatch =
        n.journeyStageId === journey?.id ||
        (!n.journeyStageId && n.journeyId === journey?.id);
      if (!stageMatch) return false;
      if (audienceId && !appliesToAudience(n.audienceIds, audienceId)) {
        return false;
      }
      if (!product) return true;
      return appliesToProduct(n.productIds, product);
    });
  }, [needs, journey?.id, audienceId, product]);

  const journeyRows = useMemo(() => {
    let scoped = rows.filter(
      (r) =>
        r.journeyStageId === journey?.id ||
        (!r.journeyStageId && r.journeyId === journey?.id),
    );
    if (audienceId) scoped = scoped.filter((r) => r.audienceId === audienceId);
    if (product) scoped = scoped.filter((r) => r.productId === product || r.product === product);
    if (temporal)
      scoped = scoped.filter((r) => r.temporalStatus === temporal);
    return scoped;
  }, [rows, journey?.id, audienceId, product, temporal]);

  const groupedFeatures = useMemo(() => {
    const map = new Map<
      string,
      {
        featureId: string;
        featureName: string;
        needs: string[];
        channels: {
          channelId: string;
          channelName: string;
          status: FeatureMapRow["status"];
          phase: FeatureMapRow["phase"];
        }[];
      }
    >();

    for (const row of journeyRows) {
      const existing = map.get(row.featureId);
      if (!existing) {
        map.set(row.featureId, {
          featureId: row.featureId,
          featureName: row.featureName,
          needs: row.userNeedName ? [row.userNeedName] : [],
          channels: [
            {
              channelId: row.channelId,
              channelName: row.channelName,
              status: row.status,
              phase: row.phase,
            },
          ],
        });
        continue;
      }
      if (
        row.userNeedName &&
        !existing.needs.includes(row.userNeedName)
      ) {
        existing.needs.push(row.userNeedName);
      }
      if (!existing.channels.some((c) => c.channelId === row.channelId)) {
        existing.channels.push({
          channelId: row.channelId,
          channelName: row.channelName,
          status: row.status,
          phase: row.phase,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.featureName.localeCompare(b.featureName, "pt-BR"),
    );
  }, [journeyRows]);

  const featureIds = useMemo(
    () => new Set(journeyRows.map((r) => r.featureId)),
    [journeyRows],
  );

  const journeyGaps = useMemo(() => {
    const catalogId = journey?.catalogJourneyId ?? "jrn-consorcio";
    const stageFeatureIds = new Set(journeyRows.map((r) => r.featureId));
    return gaps.filter((g) => {
      if (g.journeyId === journey?.id) return true;
      if (g.journeyId !== catalogId) return false;
      if (g.featureId) return stageFeatureIds.has(g.featureId);
      return stageFeatureIds.size === 0;
    });
  }, [gaps, journey?.id, journey?.catalogJourneyId, journeyRows]);

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
      if (row.phase === "AVAILABLE") entry.available.add(row.featureId);
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

  const productsInJourney = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        features: Set<string>;
        needs: Set<string>;
        channels: Set<string>;
        total: number;
        available: number;
      }
    >();
    for (const row of journeyRows) {
      const meta = getProductMeta(row.productId);
      const entry = map.get(row.productId) ?? {
        id: row.productId,
        name: meta.shortName || row.productShortName,
        features: new Set<string>(),
        needs: new Set<string>(),
        channels: new Set<string>(),
        total: 0,
        available: 0,
      };
      entry.features.add(row.featureId);
      if (row.userNeedId) entry.needs.add(row.userNeedId);
      entry.channels.add(row.channelId);
      entry.total += 1;
      if (row.phase === "AVAILABLE") entry.available += 1;
      map.set(row.productId, entry);
    }
    return Array.from(map.values())
      .map((p) => ({
        id: p.id,
        name: p.name,
        featureCount: p.features.size,
        needCount: p.needs.size,
        channelCount: p.channels.size,
        available: p.available,
        total: p.total,
        percentage: p.total === 0 ? 0 : (p.available / p.total) * 100,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
          phase: FeatureMapRow["phase"];
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
            phase: row.phase,
            channels: [row.channelName],
          });
        }
      }
      const features = Array.from(featuresMap.values()).sort((a, b) =>
        a.featureName.localeCompare(b.featureName, "pt-BR"),
      );
      const total = features.length;
      const available = features.filter((f) => f.phase === "AVAILABLE").length;
      const pct = total === 0 ? 0 : (available / total) * 100;
      return { need, total, available, pct, features };
    });
  }, [journeyNeeds, journeyRows]);

  const audienceName =
    audiences.find((a) => a.id === audienceId)?.name ?? "Todos";

  const tabs = [
    { id: "overview", label: "Visão geral" },
    { id: "needs", label: "Necessidades", count: journeyNeeds.length },
    { id: "features", label: "Funcionalidades", count: featureIds.size },
    { id: "products", label: "Produtos", count: productsInJourney.length },
    { id: "channels", label: "Canais" },
    { id: "gaps", label: CONCEPT_LABEL.issues, count: journeyGaps.length },
  ];

  function clearFilters() {
    setAudienceId(defaultAudience);
    setProduct("");
    setTemporal("");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Jornadas" }]}
        title="Jornada do Consórcio"
        description="Público → etapas → necessidades → funcionalidades. Estrutura compartilhada; particularidades por produto e canal nas implementações."
        actions={
          canEdit ? (
            <Button size="sm" type="button" onClick={() => setEditModalOpen(true)}>
              <PenLine className="h-3.5 w-3.5" />
              Editar jornadas
            </Button>
          ) : null
        }
      />

      <EditJourneysAudienceModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        audiences={audiences}
      />

      <NovaFuncionalidadeModal
        open={addFeatureOpen}
        onClose={() => setAddFeatureOpen(false)}
        audiences={audiences.map((a) => ({ value: a.id, label: a.name }))}
        moments={moments}
        journeys={journeysCatalog}
        needs={needs.map((n) => ({
          value: n.id,
          label: n.name,
          journeyId: n.journeyId,
          journeyStageId: n.journeyStageId,
          audienceIds: n.audienceIds,
        }))}
        channels={channels}
        channelContexts={channelContexts}
        journeyAudienceStages={journeyStages.map((s) => ({
          audienceId: s.audienceId,
          journeyId: s.catalogJourneyId ?? "jrn-consorcio",
          journeyStageId: s.id,
          momentId: s.momentId,
          displayName: s.name,
          sortOrder: s.order,
        }))}
        existingFeatures={existingFeatures}
        initial={addFeatureInitial}
        onCreated={() => router.refresh()}
      />

      <ConfirmDialog
        open={Boolean(deleteNeed)}
        title="Excluir necessidade"
        description={`Tem certeza que deseja excluir essa necessidade${
          deleteNeed?.name ? ` "${deleteNeed.name}"` : ""
        }?`}
        confirmLabel={pendingDelete ? "Excluindo…" : "Excluir"}
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => {
          if (!pendingDelete) setDeleteNeed(null);
        }}
        onConfirm={() => {
          if (!deleteNeed) return;
          startDelete(async () => {
            const result = await archiveRecord("user_needs", deleteNeed.id);
            if (result.ok) {
              setDeleteNeed(null);
              if (expandedNeedId === deleteNeed.id) setExpandedNeedId(null);
              router.refresh();
            } else {
              alert(result.message);
            }
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingMissingStages?.length)}
        title="Adicionar etapa da jornada?"
        description={
          pendingMissingStages && journey
            ? `A etapa "${journey.name}" ainda não existe para: ${pendingMissingStages
                .map(
                  (id) => audiences.find((a) => a.id === id)?.name ?? id,
                )
                .join(", ")}. Deseja adicionar essa etapa nesses públicos para continuar?`
            : ""
        }
        confirmLabel={
          pendingEnsureStages ? "Adicionando…" : "Sim, adicionar etapa"
        }
        cancelLabel="Não, voltar"
        onCancel={() => {
          if (pendingEnsureStages) return;
          setPendingMissingStages(null);
          allowEnsureStagesRef.current = false;
        }}
        onConfirm={() => {
          if (!journey || !pendingMissingStages?.length) return;
          startEnsureStages(async () => {
            const result = await ensureJourneyStagesForAudiences({
              journeyId: journey.catalogJourneyId ?? "jrn-consorcio",
              journeyStageId: journey.id,
              momentId: journey.momentId,
              displayName: journey.name,
              sortOrder: journey.order,
              audienceIds: pendingMissingStages,
            });
            if (!result.ok) {
              alert(result.message);
              setPendingMissingStages(null);
              return;
            }
            setPendingMissingStages(null);
            allowEnsureStagesRef.current = true;
            // Reenvia o formulário já com as etapas garantidas.
            queueMicrotask(() => needFormRef.current?.requestSubmit());
          });
        }}
      />

      {addNeedOpen && journey ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Fechar"
            onClick={() => {
              setAddNeedOpen(false);
              setPendingMissingStages(null);
              allowEnsureStagesRef.current = false;
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-need-title"
            className="relative z-[81] flex max-h-[min(92dvh,100%)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-white shadow-2xl sm:rounded-2xl"
          >
            <div className="shrink-0 border-b border-[var(--border)] px-5 pt-5 pb-4">
              <h2
                id="add-need-title"
                className="text-lg font-semibold text-slate-900"
              >
                Nova necessidade na etapa {journey.name}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                A necessidade pode valer para um ou mais públicos nesta etapa da
                jornada.
              </p>
            </div>
            <CrudForm
              formRef={needFormRef}
              action={upsertUserNeed}
              submitLabel="Criar necessidade"
              className="flex min-h-0 flex-1 flex-col space-y-0"
              bodyClassName="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-4"
              actionsClassName="shrink-0 justify-between border-t border-[var(--border)] bg-white px-5 py-4"
              extraActions={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setAddNeedOpen(false);
                    setPendingMissingStages(null);
                    allowEnsureStagesRef.current = false;
                  }}
                >
                  Cancelar
                </Button>
              }
              onBeforeSubmit={(formData) => {
                if (allowEnsureStagesRef.current) {
                  allowEnsureStagesRef.current = false;
                  return true;
                }
                const raw = String(formData.get("audience_ids") ?? "").trim();
                const selected = raw
                  ? raw.split(",").map((id) => id.trim()).filter(Boolean)
                  : needAudienceIds;
                const missing = selected.filter(
                  (aid) =>
                    !journeyStages.some(
                      (s) =>
                        s.audienceId === aid &&
                        s.id === journey.id &&
                        s.momentId === journey.momentId,
                    ),
                );
                if (missing.length > 0) {
                  setPendingMissingStages(missing);
                  return false;
                }
                return true;
              }}
              onSuccess={() => {
                setAddNeedOpen(false);
                setPendingMissingStages(null);
                setTab("needs");
              }}
            >
              <input
                type="hidden"
                name="journey_id"
                value={journey.catalogJourneyId ?? ""}
              />
              <input type="hidden" name="journey_stage_id" value={journey.id} />
              <Field label="Nome" name="name" required />
              <AudienceMultiSelect
                required
                options={audiences.map((a) => ({ id: a.id, name: a.name }))}
                selected={needAudienceIds}
                onChange={setNeedAudienceIds}
                hint="Selecione os públicos aos quais esta necessidade se aplica."
              />
              {needAudienceIds.some(
                (aid) =>
                  !journeyStages.some(
                    (s) =>
                      s.audienceId === aid &&
                      s.id === journey.id &&
                      s.momentId === journey.momentId,
                  ),
              ) ? (
                <p className="text-xs text-amber-700">
                  Alguns públicos selecionados ainda não têm a etapa &quot;
                  {journey.name}&quot;. Ao salvar, pediremos confirmação para
                  adicioná-la.
                </p>
              ) : null}
              <Field
                label="Prioridade"
                name="priority"
                as="select"
                defaultValue="MEDIUM"
                options={[
                  { value: "CRITICAL", label: "Crítica" },
                  { value: "HIGH", label: "Alta" },
                  { value: "MEDIUM", label: "Média" },
                  { value: "LOW", label: "Baixa" },
                ]}
              />
              <ProductMultiSelect
                required
                hint="Selecione os produtos aos quais esta necessidade se aplica."
              />
              <Field label="Descrição" name="description" as="textarea" />
              <MeasurementAndEvidenceFields
                measurementHint="Como saberemos se essa necessidade foi atendida para o cliente."
              />
            </CrudForm>
          </div>
        </div>
      ) : null}

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
              ...products.map((p) => ({ value: p.id, label: p.name })),
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
        <SectionTitle
          action={
            canEdit ? (
              <Link
                href={`/jornadas/editar?publico=${audienceId}`}
                className="shrink-0 text-sm font-medium text-[var(--brand)] hover:underline"
              >
                Editar esta jornada
              </Link>
            ) : undefined
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            Etapas da jornada
            {product ? (
              <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--brand)] ring-1 ring-[var(--brand)]/15">
                {products.find((p) => p.id === product)?.name ?? product}
              </span>
            ) : null}
          </span>
        </SectionTitle>
        {!journey ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhuma etapa cadastrada para {audienceName}.
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
          <div className="relative max-w-md rounded-2xl border border-[#b3d4eb] bg-[#e6f0f7] px-4 py-3 text-sm leading-relaxed text-[#005ca9] italic">
            <span className="absolute -left-1.5 top-4 h-3 w-3 rotate-45 border-b border-l border-[#b3d4eb] bg-[#e6f0f7]" />
            &quot;{meta.quote}&quot;
          </div>
        </div>

        <div className="mt-5 border-b border-[var(--border)]">
          <UnderlineTabs
            className="border-b-0"
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            options={tabs}
          />
        </div>

        <div className="mt-5">
          {tab === "overview" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <KpiTile
                icon={ClipboardList}
                value={journeyNeeds.length}
                label="Necessidades"
                hint="Conteúdo desta etapa da jornada"
                tone="brand"
                onClick={() => setTab("needs")}
              />
              <KpiTile
                icon={Grid2x2}
                value={featureIds.size}
                label="Funcionalidades"
                hint="Relacionadas às necessidades desta etapa"
                tone="slate"
                onClick={() => setTab("features")}
              />
              <KpiTile
                icon={CheckCircle2}
                value={productsInJourney.length}
                label="Produtos"
                hint="Com aplicabilidade nesta etapa"
                tone="success"
                onClick={() => setTab("products")}
              />
              <KpiTile
                icon={Settings2}
                value={coverageByChannel.length}
                label="Canais"
                hint="Contextos de implementação"
                tone="warning"
                onClick={() => setTab("channels")}
              />
              <KpiTile
                icon={ShieldAlert}
                value={journeyGaps.length}
                label={CONCEPT_LABEL.issues}
                hint={`${CONCEPT_LABEL.issues} nesta etapa`}
                tone="danger"
                onClick={() => setTab("gaps")}
              />
            </div>
          ) : null}

          {tab === "needs" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Necessidades da etapa {journey?.name ?? ""}
                </p>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={!journey}
                    onClick={() => {
                      setNeedAudienceIds(
                        audienceId
                          ? [audienceId]
                          : audiences.map((a) => a.id),
                      );
                      setPendingMissingStages(null);
                      allowEnsureStagesRef.current = false;
                      setAddNeedOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar necessidade
                  </Button>
                ) : null}
              </div>
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
              {needsWithCoverage.length === 0 ? (
                <p className="p-4 text-sm text-[var(--muted-foreground)]">
                  Nenhuma necessidade nesta etapa.
                </p>
              ) : (
                needsWithCoverage.map(
                  ({ need, total, available, pct, features }) => {
                    const open = expandedNeedId === need.id;
                    return (
                      <div key={need.id}>
                        <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNeedId(open ? null : need.id)
                            }
                            aria-expanded={open}
                            className="min-w-0 flex-1 text-left"
                          >
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
                              <ApplicabilityLabel
                                productIds={need.productIds}
                              />
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
                            {need.measurement ? (
                              <p className="mt-1 pl-6 text-[11px] text-slate-600">
                                <span className="font-semibold text-slate-500">
                                  Mensuração:
                                </span>{" "}
                                {need.measurement}
                              </p>
                            ) : null}
                          </button>
                          <div className="flex w-full items-center gap-3 sm:w-auto">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNeedId(open ? null : need.id)
                              }
                              className="min-w-0 flex-1 text-left sm:w-44 sm:flex-none"
                            >
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
                            </button>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {isAdmin ? (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 px-2.5"
                                >
                                  <Link
                                    href={`/cadastros/necessidades?edit=${need.id}&from=${encodeURIComponent(
                                      `/jornadas?journey=${journey?.id ?? need.journeyId}`,
                                    )}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                  </Link>
                                </Button>
                              ) : null}
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() =>
                                    setDeleteNeed({
                                      id: need.id,
                                      name: need.name,
                                    })
                                  }
                                >
                                  Excluir
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {open ? (
                          <div className="space-y-3 border-t border-[var(--border)] bg-slate-50/70 px-4 py-3">
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
                            {canEdit ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddFeatureInitial({
                                    audienceIds: audienceId
                                      ? [audienceId]
                                      : [],
                                    momentId: journey?.momentId,
                                    journeyId:
                                      journey?.catalogJourneyId ??
                                      "jrn-consorcio",
                                    journeyStageId: journey?.id,
                                    needId: need.id,
                                    priority: need.priority,
                                    lockNeed: true,
                                  });
                                  setAddFeatureOpen(true);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Adicionar funcionalidade
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  },
                )
              )}
              </div>
            </div>
          ) : null}

          {tab === "features" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Funcionalidades da etapa {journey?.name ?? ""}
                </p>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={!journey}
                    onClick={() => {
                      setAddFeatureInitial({
                        audienceIds: audienceId ? [audienceId] : [],
                        momentId: journey?.momentId,
                        journeyId:
                          journey?.catalogJourneyId ?? "jrn-consorcio",
                        journeyStageId: journey?.id,
                        lockNeed: false,
                      });
                      setAddFeatureOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar funcionalidade
                  </Button>
                ) : null}
              </div>
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                    <tr>
                      <th className="px-4 py-3">Funcionalidade</th>
                      <th className="px-4 py-3">Necessidade</th>
                      <th className="px-4 py-3">Canais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedFeatures.map((feature) => (
                      <tr
                        key={feature.featureId}
                        className="border-t border-[var(--border)] align-top"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/funcionalidades/${feature.featureId}`}
                            className="font-medium text-[var(--brand)] hover:underline"
                          >
                            {feature.featureName}
                          </Link>
                          {feature.channels.length > 1 ? (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {feature.channels.length} canais
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">
                          {feature.needs.join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <ul className="space-y-2">
                            {feature.channels.map((ch) => (
                              <li
                                key={ch.channelId}
                                className="flex flex-wrap items-center gap-2"
                              >
                                <span className="text-sm text-slate-800">
                                  {ch.channelName}
                                </span>
                                <StageBadge stage={ch.phase} />
                                <StatusBadge status={ch.status} />
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {groupedFeatures.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--muted-foreground)]">
                    Nenhuma funcionalidade encontrada.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "products" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Produtos com aplicabilidade na etapa {journey?.name ?? ""}
              </p>
              {productsInJourney.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
                  Nenhum produto encontrado nesta etapa com o filtro atual.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {productsInJourney.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl border border-[var(--border)] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {p.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {p.featureCount} funcionalidade
                            {p.featureCount === 1 ? "" : "s"}
                            {" · "}
                            {p.needCount} necessidade
                            {p.needCount === 1 ? "" : "s"}
                            {" · "}
                            {p.channelCount} canal
                            {p.channelCount === 1 ? "" : "is"}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          {formatPercent(p.percentage)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Cobertura de implementações</span>
                          <span className="tabular-nums">
                            {p.available}/{p.total}
                          </span>
                        </div>
                        <ProgressBar value={p.percentage} />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProduct(p.id);
                          setTab("features");
                        }}
                        className="mt-3 text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Mostrar funcionalidades →
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  Nenhuma {CONCEPT_LABEL.issue.toLowerCase()} associada a esta jornada.
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
  onClick,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  hint: string;
  tone: "brand" | "slate" | "success" | "warning" | "danger";
  bar?: number;
  onClick?: () => void;
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

  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-xl border border-[var(--border)] bg-white p-4 text-left transition hover:border-[var(--brand)]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30"
      >
        {content}
      </button>
    );
  }

  return <SurfaceCard className="p-4">{content}</SurfaceCard>;
}
