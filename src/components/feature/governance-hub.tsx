"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  upsertEvidence,
  upsertFeature,
  upsertFeatureChannelContext,
  upsertGap,
  upsertRoadmapItem,
} from "@/app/actions/crud";
import { AudienceBadge } from "@/components/badges/audience-badge";
import { ChannelBadge } from "@/components/badges/channel-badge";
import { ExperienceBadge } from "@/components/badges/experience-badge";
import { MomentBadge } from "@/components/badges/moment-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import { EvidenceAttachmentView, EvidenceFileField } from "@/components/feature/evidence-file-field";
import { GapCard } from "@/components/gaps/gap-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  evidenceTypeLabel,
  experienceLabel,
  featureStatusLabel,
  featureStatusOptions,
  gapStatusLabel,
  gapTypeLabel,
  priorityLabel,
} from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import type {
  Capability,
  Evidence,
  Feature,
  FeatureMapRow,
  Gap,
  Journey,
  RoadmapItem,
  UserNeed,
} from "@/types";
import {
  ClipboardList,
  FileText,
  Milestone,
  ShieldAlert,
  Users,
  Waypoints,
} from "lucide-react";

type Option = { value: string; label: string };

type TabId =
  | "overview"
  | "owners"
  | "contexts"
  | "roadmap"
  | "evidences"
  | "gaps";

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Visão geral", icon: ClipboardList },
  { id: "owners", label: "Responsáveis", icon: Users },
  { id: "contexts", label: "Status por contexto", icon: Waypoints },
  { id: "roadmap", label: "Roadmap", icon: Milestone },
  { id: "evidences", label: "Evidências", icon: FileText },
  { id: "gaps", label: "Gaps", icon: ShieldAlert },
];

export function GovernanceHub({
  feature,
  hierarchy,
  contexts,
  evidences,
  roadmap,
  gaps,
  channelContextOptions,
  audienceOptions,
  momentOptions,
  journeyOptions,
  userNeedOptions,
  channelOptions,
}: {
  feature: Feature;
  hierarchy: {
    journey?: Journey;
    userNeed?: UserNeed;
    capability?: Capability;
  };
  contexts: FeatureMapRow[];
  evidences: Evidence[];
  roadmap: RoadmapItem[];
  gaps: Gap[];
  channelContextOptions: Option[];
  audienceOptions: Option[];
  momentOptions: Option[];
  journeyOptions: Option[];
  userNeedOptions: Option[];
  channelOptions: Option[];
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [editingContextId, setEditingContextId] = useState<string | null>(null);
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(
    null,
  );

  const editingContext = useMemo(
    () => contexts.find((c) => c.featureChannelContextId === editingContextId),
    [contexts, editingContextId],
  );
  const editingRoadmap = useMemo(
    () => roadmap.find((r) => r.id === editingRoadmapId),
    [roadmap, editingRoadmapId],
  );
  const editingEvidence = useMemo(
    () => evidences.find((e) => e.id === editingEvidenceId),
    [evidences, editingEvidenceId],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {feature.isDemo ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 ring-1 ring-amber-200 uppercase">
                Dado DEMO
              </span>
            ) : null}
            <PriorityBadge priority={feature.priority} />
            <span className="rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--brand)] uppercase">
              Governança
            </span>
          </div>
          <CardTitle className="text-2xl">{feature.name}</CardTitle>
          <CardDescription>{feature.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Produto" value={feature.product} />
          <Meta label="Jornada" value={hierarchy.journey?.name ?? "—"} />
          <Meta label="Necessidade" value={hierarchy.userNeed?.name ?? "—"} />
          <Meta label="Capacidade" value={hierarchy.capability?.name ?? "—"} />
          <Meta label="Owner" value={feature.owner || "—"} />
          <Meta label="UX Owner" value={feature.uxOwner || "—"} />
          <Meta label="CX Owner" value={feature.cxOwner || "—"} />
          <Meta label="Product Owner" value={feature.productOwner || "—"} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface)] text-[var(--foreground)] ring-1 ring-[var(--border)] hover:bg-[var(--muted)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <OverviewPanel
          feature={feature}
          contexts={contexts}
          roadmap={roadmap}
          evidences={evidences}
          gaps={gaps}
          onNavigate={setTab}
        />
      ) : null}

      {tab === "owners" ? (
        <Card>
          <CardHeader>
            <CardTitle>Responsáveis</CardTitle>
            <CardDescription>
              Atualize ownership de Produto, UX e CX desta funcionalidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrudForm action={upsertFeature}>
              <input type="hidden" name="id" value={feature.id} />
              <input
                type="hidden"
                name="capability_id"
                value={feature.capabilityId}
              />
              <input type="hidden" name="name" value={feature.name} />
              <input type="hidden" name="product" value={feature.product} />
              {feature.isDemo ? (
                <input type="hidden" name="is_demo" value="true" />
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Owner"
                  name="owner"
                  defaultValue={feature.owner}
                />
                <Field
                  label="UX Owner"
                  name="ux_owner"
                  defaultValue={feature.uxOwner}
                />
                <Field
                  label="CX Owner"
                  name="cx_owner"
                  defaultValue={feature.cxOwner}
                />
                <Field
                  label="Product Owner"
                  name="product_owner"
                  defaultValue={feature.productOwner}
                />
                <Field
                  label="Prioridade"
                  name="priority"
                  as="select"
                  defaultValue={feature.priority}
                  options={Object.entries(priorityLabel).map(
                    ([value, label]) => ({ value, label }),
                  )}
                />
              </div>
              <Field
                label="Descrição"
                name="description"
                as="textarea"
                defaultValue={feature.description}
              />
            </CrudForm>
          </CardContent>
        </Card>
      ) : null}

      {tab === "contexts" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingContext ? "Editar" : "Adicionar"} status por contexto
              </CardTitle>
              <CardDescription>
                Público + Momento + Canal definem o contexto. O status não fica
                na funcionalidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CrudForm
                key={editingContext?.featureChannelContextId ?? "new-ctx"}
                action={upsertFeatureChannelContext}
                onSuccess={() => setEditingContextId(null)}
              >
                {editingContext ? (
                  <input
                    type="hidden"
                    name="id"
                    value={editingContext.featureChannelContextId}
                  />
                ) : null}
                <input type="hidden" name="feature_id" value={feature.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Contexto de canal"
                    name="channel_context_id"
                    as="select"
                    required
                    defaultValue={editingContext?.channelContextId}
                    options={channelContextOptions}
                  />
                  <Field
                    label="Status"
                    name="status"
                    as="select"
                    defaultValue={editingContext?.status ?? "BACKLOG"}
                    options={featureStatusOptions()}
                  />
                  <Field
                    label="Experiência"
                    name="experience"
                    as="select"
                    defaultValue={
                      editingContext?.experience ?? "NOT_EVALUATED"
                    }
                    options={Object.entries(experienceLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Field
                    label="Responsável"
                    name="responsible"
                    defaultValue={
                      editingContext?.responsible ?? feature.productOwner
                    }
                  />
                  <Field
                    label="Início"
                    name="start_date"
                    type="date"
                    defaultValue={editingContext?.startDate}
                  />
                  <Field
                    label="Previsão"
                    name="expected_date"
                    type="date"
                    defaultValue={editingContext?.expectedDate}
                  />
                  <Field
                    label="Go-live"
                    name="launch_date"
                    type="date"
                    defaultValue={editingContext?.launchDate}
                  />
                </div>
                <Field
                  label="Observações"
                  name="notes"
                  as="textarea"
                  defaultValue={editingContext?.notes}
                />
                {editingContext ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingContextId(null)}
                  >
                    Cancelar edição
                  </Button>
                ) : null}
              </CrudForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contextos cadastrados</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--muted)] text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                  <tr>
                    <th className="px-3 py-2">Público</th>
                    <th className="px-3 py-2">Momento</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Experiência</th>
                    <th className="px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contexts.map((ctx) => (
                    <tr
                      key={ctx.featureChannelContextId}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-3 py-3">
                        <AudienceBadge
                          code={ctx.audienceCode}
                          name={ctx.audienceName}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <MomentBadge
                          code={ctx.momentCode}
                          name={ctx.momentName}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <ChannelBadge
                          name={ctx.channelName}
                          temporalStatus={ctx.temporalStatus}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={ctx.status} />
                      </td>
                      <td className="px-3 py-3">
                        <ExperienceBadge experience={ctx.experience} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingContextId(ctx.featureChannelContextId)
                            }
                          >
                            Editar
                          </Button>
                          <ArchiveButton
                            table="feature_channel_contexts"
                            id={ctx.featureChannelContextId}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "roadmap" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingRoadmap ? "Editar" : "Nova"} fase de roadmap
              </CardTitle>
              <CardDescription>
                Fases: necessidade → discovery → UX → validação → priorização →
                desenvolvimento → homologação → go-live → pós-go-live.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CrudForm
                key={editingRoadmap?.id ?? "new-rm"}
                action={upsertRoadmapItem}
                onSuccess={() => setEditingRoadmapId(null)}
              >
                {editingRoadmap ? (
                  <input type="hidden" name="id" value={editingRoadmap.id} />
                ) : null}
                <input type="hidden" name="feature_id" value={feature.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Status"
                    name="phase"
                    as="select"
                    required
                    defaultValue={editingRoadmap?.phase ?? "BACKLOG"}
                    options={featureStatusOptions()}
                  />
                  <Field
                    label="Contexto de canal (opcional)"
                    name="channel_context_id"
                    as="select"
                    defaultValue={editingRoadmap?.channelContextId}
                    options={channelContextOptions}
                  />
                  <Field
                    label="Início"
                    name="start_date"
                    type="date"
                    defaultValue={editingRoadmap?.startDate}
                  />
                  <Field
                    label="Previsão"
                    name="expected_date"
                    type="date"
                    defaultValue={editingRoadmap?.expectedDate}
                  />
                  <Field
                    label="Data real"
                    name="actual_date"
                    type="date"
                    defaultValue={editingRoadmap?.actualDate}
                  />
                  <Field
                    label="Responsável"
                    name="responsible"
                    defaultValue={
                      editingRoadmap?.responsible ?? feature.productOwner
                    }
                  />
                </div>
                <Field
                  label="Observações"
                  name="notes"
                  as="textarea"
                  defaultValue={editingRoadmap?.notes}
                />
              </CrudForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {roadmap.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhuma fase registrada.
                </p>
              ) : (
                roadmap.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {featureStatusLabel[item.phase as keyof typeof featureStatusLabel] ??
                          item.phase}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Início: {formatDate(item.startDate)} · Previsão:{" "}
                        {formatDate(item.expectedDate)} · Real:{" "}
                        {formatDate(item.actualDate)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Responsável: {item.responsible || "—"}
                      </p>
                      {item.notes ? (
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingRoadmapId(item.id)}
                      >
                        Editar
                      </Button>
                      <ArchiveButton table="roadmap_items" id={item.id} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "evidences" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingEvidence ? "Editar" : "Nova"} evidência
              </CardTitle>
              <CardDescription>
                Pesquisa UX, reclamações, analytics, jornada CX e outros
                insumos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CrudForm
                key={editingEvidence?.id ?? "new-ev"}
                action={upsertEvidence}
                onSuccess={() => setEditingEvidenceId(null)}
              >
                {editingEvidence ? (
                  <input type="hidden" name="id" value={editingEvidence.id} />
                ) : null}
                <input type="hidden" name="feature_id" value={feature.id} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Título"
                    name="title"
                    required
                    defaultValue={editingEvidence?.title}
                  />
                  <Field
                    label="Tipo"
                    name="type"
                    as="select"
                    defaultValue={editingEvidence?.type ?? "OTHER"}
                    options={Object.entries(evidenceTypeLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Field
                    label="Data"
                    name="evidence_date"
                    type="date"
                    defaultValue={editingEvidence?.date}
                  />
                  <Field
                    label="Responsável"
                    name="responsible"
                    defaultValue={
                      editingEvidence?.responsible ?? feature.cxOwner
                    }
                  />
                  <Field
                    label="Link"
                    name="link"
                    defaultValue={editingEvidence?.link}
                  />
                </div>
                <EvidenceFileField
                  existingFileName={editingEvidence?.fileName}
                  existingFileMime={editingEvidence?.fileMime}
                  existingFileSize={editingEvidence?.fileSize}
                  existingFileUrl={editingEvidence?.fileUrl}
                />
                <Field
                  label="Descrição"
                  name="description"
                  as="textarea"
                  defaultValue={editingEvidence?.description}
                />
              </CrudForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidências vinculadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidences.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhuma evidência cadastrada.
                </p>
              ) : (
                evidences.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-[var(--muted)] px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                          {evidenceTypeLabel[evidence.type]}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {formatDate(evidence.date)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEvidenceId(evidence.id)}
                        >
                          Editar
                        </Button>
                        <ArchiveButton table="evidences" id={evidence.id} />
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium">{evidence.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {evidence.description}
                    </p>
                    <EvidenceAttachmentView
                      fileName={evidence.fileName}
                      fileMime={evidence.fileMime}
                      fileSize={evidence.fileSize}
                      fileUrl={evidence.fileUrl}
                    />
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Responsável: {evidence.responsible}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "gaps" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registrar gap</CardTitle>
              <CardDescription>
                Cobertura, experiência, consistência, informação, operacional ou
                transição.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CrudForm action={upsertGap}>
                <input type="hidden" name="feature_id" value={feature.id} />
                <input type="hidden" name="is_demo" value="true" />
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Título" name="title" required />
                  <Field
                    label="Tipo"
                    name="type"
                    as="select"
                    defaultValue="COVERAGE"
                    options={Object.entries(gapTypeLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Field
                    label="Público"
                    name="audience_id"
                    as="select"
                    required
                    defaultValue={contexts[0]?.audienceId}
                    options={audienceOptions}
                  />
                  <Field
                    label="Momento"
                    name="moment_id"
                    as="select"
                    required
                    defaultValue={contexts[0]?.momentId}
                    options={momentOptions}
                  />
                  <Field
                    label="Jornada"
                    name="journey_id"
                    as="select"
                    required
                    defaultValue={hierarchy.journey?.id}
                    options={journeyOptions}
                  />
                  <Field
                    label="Necessidade"
                    name="user_need_id"
                    as="select"
                    required
                    defaultValue={hierarchy.userNeed?.id}
                    options={userNeedOptions}
                  />
                  <Field
                    label="Canal atual"
                    name="current_channel_id"
                    as="select"
                    options={channelOptions}
                  />
                  <Field
                    label="Canal futuro"
                    name="future_channel_id"
                    as="select"
                    options={channelOptions}
                  />
                  <Field
                    label="Impacto"
                    name="impact"
                    as="select"
                    defaultValue="HIGH"
                    options={Object.entries(priorityLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Field
                    label="Prioridade"
                    name="priority"
                    as="select"
                    defaultValue="HIGH"
                    options={Object.entries(priorityLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Field
                    label="Status"
                    name="status"
                    as="select"
                    defaultValue="OPEN"
                    options={Object.entries(gapStatusLabel).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Field
                    label="Responsável"
                    name="responsible"
                    defaultValue={feature.cxOwner || feature.productOwner}
                  />
                </div>
                <Field label="Descrição" name="description" as="textarea" />
                <Field label="Plano de ação" name="action_plan" as="textarea" />
              </CrudForm>
            </CardContent>
          </Card>

          {gaps.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhum gap associado a esta funcionalidade.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {gaps.map((gap) => (
                <div key={gap.id} className="space-y-2">
                  <GapCard gap={gap} />
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/gaps/${gap.id}`}>Abrir detalhe</Link>
                    </Button>
                    <ArchiveButton table="gaps" id={gap.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function OverviewPanel({
  feature,
  contexts,
  roadmap,
  evidences,
  gaps,
  onNavigate,
}: {
  feature: Feature;
  contexts: FeatureMapRow[];
  roadmap: RoadmapItem[];
  evidences: Evidence[];
  gaps: Gap[];
  onNavigate: (tab: TabId) => void;
}) {
  const available = contexts.filter((c) => c.status === "AVAILABLE").length;
  const problems = contexts.filter(
    (c) =>
      c.experience === "NEEDS_IMPROVEMENT" || c.experience === "CRITICAL",
  ).length;
  const openGaps = gaps.filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Contextos"
        value={contexts.length}
        hint={`${available} disponíveis · ${problems} com problema`}
        actionLabel="Gerenciar status"
        onAction={() => onNavigate("contexts")}
      />
      <SummaryCard
        title="Roadmap"
        value={roadmap.length}
        hint="Fases registradas"
        actionLabel="Editar roadmap"
        onAction={() => onNavigate("roadmap")}
      />
      <SummaryCard
        title="Evidências"
        value={evidences.length}
        hint="Insumos vinculados"
        actionLabel="Gerenciar evidências"
        onAction={() => onNavigate("evidences")}
      />
      <SummaryCard
        title="Gaps abertos"
        value={openGaps}
        hint={`Owner: ${feature.productOwner || "—"}`}
        actionLabel="Tratar gaps"
        onAction={() => onNavigate("gaps")}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  value: number;
  hint: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-[var(--muted-foreground)]">
          {title}
        </CardTitle>
        <p className="font-[family-name:var(--font-display)] text-3xl font-semibold">
          {value}
        </p>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
