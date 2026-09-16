"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  upsertEvidence,
  upsertFeature,
  upsertFeatureChannelContext,
  upsertFeatureEvolution,
  upsertGap,
  upsertRoadmapItem,
} from "@/app/actions/crud";
import { AudienceBadge } from "@/components/badges/audience-badge";
import { ChannelBadge } from "@/components/badges/channel-badge";
import { ExperienceBadge } from "@/components/badges/experience-badge";
import { MomentBadge } from "@/components/badges/moment-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StageBadge } from "@/components/badges/stage-badge";
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
  evolutionPhaseLabel,
  evolutionPhaseOptions,
  evolutionStatusLabel,
  experienceLabel,
  featureStageLabel,
  featureStageOptions,
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
  FeatureEvolution,
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
  Plus,
  ShieldAlert,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";

type Option = { value: string; label: string };

type ChannelContextMatrixItem = {
  id: string;
  audienceId: string;
  momentId: string;
  channelId: string;
  temporalStatus: string;
};

type TabId =
  | "overview"
  | "owners"
  | "contexts"
  | "evolutions"
  | "roadmap"
  | "evidences"
  | "gaps";

const tabs: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: "overview", label: "Visão geral", icon: ClipboardList },
  { id: "owners", label: "Responsáveis", icon: Users },
  { id: "contexts", label: "Status por contexto", icon: Waypoints },
  { id: "evolutions", label: "Evoluções", icon: Sparkles },
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
  evolutions,
  gaps,
  channelContextOptions,
  channelContextMatrix,
  fccOptions,
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
  evolutions: FeatureEvolution[];
  gaps: Gap[];
  channelContextOptions: Option[];
  channelContextMatrix: ChannelContextMatrixItem[];
  fccOptions: Option[];
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
  const [editingEvolutionId, setEditingEvolutionId] = useState<string | null>(
    null,
  );
  const [addingContext, setAddingContext] = useState(false);
  const [addingRoadmap, setAddingRoadmap] = useState(false);
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [addingEvolution, setAddingEvolution] = useState(false);
  const [addingGap, setAddingGap] = useState(false);

  function switchTab(next: TabId) {
    setTab(next);
    setEditingContextId(null);
    setEditingRoadmapId(null);
    setEditingEvidenceId(null);
    setEditingEvolutionId(null);
    setAddingContext(false);
    setAddingRoadmap(false);
    setAddingEvidence(false);
    setAddingEvolution(false);
    setAddingGap(false);
  }

  function closeContextForm() {
    setEditingContextId(null);
    setAddingContext(false);
  }
  function closeRoadmapForm() {
    setEditingRoadmapId(null);
    setAddingRoadmap(false);
  }
  function closeEvidenceForm() {
    setEditingEvidenceId(null);
    setAddingEvidence(false);
  }
  function closeEvolutionForm() {
    setEditingEvolutionId(null);
    setAddingEvolution(false);
  }

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
  const editingEvolution = useMemo(
    () => evolutions.find((e) => e.id === editingEvolutionId),
    [evolutions, editingEvolutionId],
  );

  const activeEvolutionsList = useMemo(
    () =>
      evolutions.filter(
        (e) =>
          e.phase !== "DONE" &&
          e.status !== "DONE" &&
          e.status !== "CANCELLED",
      ),
    [evolutions],
  );
  const doneEvolutionsList = useMemo(
    () =>
      evolutions.filter((e) => e.phase === "DONE" || e.status === "DONE"),
    [evolutions],
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
              onClick={() => switchTab(item.id)}
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
          activeEvolutions={activeEvolutionsList.length}
          onNavigate={switchTab}
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
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Contextos cadastrados</CardTitle>
                <CardDescription>
                  Público + Momento + Canal definem o contexto. O status não
                  fica na funcionalidade.
                </CardDescription>
              </div>
              {!addingContext && !editingContext ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingContextId(null);
                    setAddingContext(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar status por contexto
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {contexts.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nenhum contexto cadastrado ainda.
                </p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[var(--muted)] text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                    <tr>
                      <th className="px-3 py-2">Público</th>
                      <th className="px-3 py-2">Momento</th>
                      <th className="px-3 py-2">Canal</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Etapa</th>
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
                          <StageBadge stage={ctx.phase} />
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
                              onClick={() => {
                                setAddingContext(false);
                                setEditingContextId(
                                  ctx.featureChannelContextId,
                                );
                              }}
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
              )}
            </CardContent>
          </Card>

          {addingContext || editingContext ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingContext ? "Editar" : "Adicionar"} status por contexto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CrudForm
                  key={editingContext?.featureChannelContextId ?? "new-ctx"}
                  action={upsertFeatureChannelContext}
                  onSuccess={closeContextForm}
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
                      defaultValue={editingContext?.status ?? "NO_DEADLINE"}
                      options={featureStatusOptions()}
                    />
                    <Field
                      label="Etapa"
                      name="phase"
                      as="select"
                      defaultValue={editingContext?.phase ?? "BACKLOG"}
                      options={featureStageOptions()}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeContextForm}
                  >
                    Cancelar
                  </Button>
                </CrudForm>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "evolutions" ? (
        <EvolutionsPanel
          feature={feature}
          contexts={contexts}
          evolutions={evolutions}
          activeEvolutions={activeEvolutionsList}
          doneEvolutions={doneEvolutionsList}
          fccOptions={fccOptions}
          editingEvolution={editingEvolution}
          addingEvolution={addingEvolution}
          setAddingEvolution={setAddingEvolution}
          setEditingEvolutionId={setEditingEvolutionId}
          onCloseForm={closeEvolutionForm}
        />
      ) : null}

      {tab === "roadmap" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Timeline</CardTitle>
                <CardDescription>
                  Fases de roadmap já registradas para esta funcionalidade.
                </CardDescription>
              </div>
              {!addingRoadmap && !editingRoadmap ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingRoadmapId(null);
                    setAddingRoadmap(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar fase de roadmap
                </Button>
              ) : null}
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
                        {featureStageLabel[
                          item.phase as keyof typeof featureStageLabel
                        ] ?? item.phase}
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
                        onClick={() => {
                          setAddingRoadmap(false);
                          setEditingRoadmapId(item.id);
                        }}
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

          {addingRoadmap || editingRoadmap ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingRoadmap ? "Editar" : "Nova"} fase de roadmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RoadmapPhaseForm
                  key={editingRoadmap?.id ?? "new-rm"}
                  feature={feature}
                  editingRoadmap={editingRoadmap}
                  audienceOptions={audienceOptions}
                  momentOptions={momentOptions}
                  channelOptions={channelOptions}
                  channelContextMatrix={channelContextMatrix}
                  onSuccess={closeRoadmapForm}
                  onCancel={closeRoadmapForm}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "evidences" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Evidências vinculadas</CardTitle>
                <CardDescription>
                  Pesquisa UX, reclamações, analytics, jornada CX e outros
                  insumos.
                </CardDescription>
              </div>
              {!addingEvidence && !editingEvidence ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setEditingEvidenceId(null);
                    setAddingEvidence(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar evidência
                </Button>
              ) : null}
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
                          onClick={() => {
                            setAddingEvidence(false);
                            setEditingEvidenceId(evidence.id);
                          }}
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

          {addingEvidence || editingEvidence ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingEvidence ? "Editar" : "Nova"} evidência
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CrudForm
                  key={editingEvidence?.id ?? "new-ev"}
                  action={upsertEvidence}
                  onSuccess={closeEvidenceForm}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeEvidenceForm}
                  >
                    Cancelar
                  </Button>
                </CrudForm>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "gaps" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Gaps associados</CardTitle>
                <CardDescription>
                  Cobertura, experiência, consistência, informação, operacional
                  ou transição.
                </CardDescription>
              </div>
              {!addingGap ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setAddingGap(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar gap
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {addingGap ? (
            <Card>
              <CardHeader>
                <CardTitle>Registrar gap</CardTitle>
              </CardHeader>
              <CardContent>
                <CrudForm
                  action={upsertGap}
                  onSuccess={() => setAddingGap(false)}
                >
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
                  <Field
                    label="Plano de ação"
                    name="action_plan"
                    as="textarea"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddingGap(false)}
                  >
                    Cancelar
                  </Button>
                </CrudForm>
              </CardContent>
            </Card>
          ) : null}
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
  activeEvolutions,
  onNavigate,
}: {
  feature: Feature;
  contexts: FeatureMapRow[];
  roadmap: RoadmapItem[];
  evidences: Evidence[];
  gaps: Gap[];
  activeEvolutions: number;
  onNavigate: (tab: TabId) => void;
}) {
  const available = contexts.filter((c) => c.phase === "AVAILABLE").length;
  const problems = contexts.filter(
    (c) =>
      c.experience === "NEEDS_IMPROVEMENT" || c.experience === "CRITICAL",
  ).length;
  const openGaps = gaps.filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  ).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        title="Contextos"
        value={contexts.length}
        hint={`${available} disponíveis · ${problems} com problema`}
        actionLabel="Gerenciar status"
        onAction={() => onNavigate("contexts")}
      />
      <SummaryCard
        title="Evoluções"
        value={activeEvolutions}
        hint="✦ melhorias em andamento"
        actionLabel="Ver evoluções"
        onAction={() => onNavigate("evolutions")}
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

function EvolutionsPanel({
  feature,
  contexts,
  evolutions,
  activeEvolutions,
  doneEvolutions,
  fccOptions,
  editingEvolution,
  addingEvolution,
  setAddingEvolution,
  setEditingEvolutionId,
  onCloseForm,
}: {
  feature: Feature;
  contexts: FeatureMapRow[];
  evolutions: FeatureEvolution[];
  activeEvolutions: FeatureEvolution[];
  doneEvolutions: FeatureEvolution[];
  fccOptions: Option[];
  editingEvolution: FeatureEvolution | undefined;
  addingEvolution: boolean;
  setAddingEvolution: (open: boolean) => void;
  setEditingEvolutionId: (id: string | null) => void;
  onCloseForm: () => void;
}) {
  const contextByFcc = new Map(
    contexts.map((c) => [c.featureChannelContextId, c]),
  );
  const showForm = addingEvolution || Boolean(editingEvolution);

  function channelLabel(fccId: string) {
    const ctx = contextByFcc.get(fccId);
    if (!ctx) return "Canal";
    return `${ctx.channelName} · ${ctx.audienceName} · ${ctx.momentName}`;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle>Evoluções em andamento</CardTitle>
            <CardDescription>
              {activeEvolutions.length === 0
                ? "Nenhuma evolução em andamento para esta funcionalidade."
                : `${activeEvolutions.length} iniciativa(s) ativa(s).`}
            </CardDescription>
          </div>
          {!showForm ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingEvolutionId(null);
                setAddingEvolution(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar evolução
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {activeEvolutions.length === 0 && evolutions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Ainda não há evoluções atribuídas a esta funcionalidade.
            </p>
          ) : null}
          {activeEvolutions.map((evo) => (
            <div
              key={evo.id}
              className="rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    <span className="mr-1 text-amber-600">✦</span>
                    {evo.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {channelLabel(evo.featureChannelContextId)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                    {evolutionPhaseLabel(evo.phase)}
                  </span>
                  <PriorityBadge priority={evo.priority} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingEvolution(false);
                      setEditingEvolutionId(evo.id);
                    }}
                  >
                    Editar
                  </Button>
                  <ArchiveButton
                    table="feature_evolutions"
                    id={evo.id}
                    label="Arquivar"
                  />
                </div>
              </div>
              {evo.description ? (
                <p className="mt-2 text-sm text-slate-600">{evo.description}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-slate-500">
                {evolutionStatusLabel[evo.status]} · Prev.{" "}
                {formatDate(evo.expectedDate)} ·{" "}
                {evo.responsible || "Sem responsável"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {doneEvolutions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de evoluções</CardTitle>
            <CardDescription>
              Evoluções concluídas permanecem registradas sem alterar a fase da
              implementação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {doneEvolutions.map((evo) => (
              <div
                key={evo.id}
                className="rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <p className="text-sm font-medium text-slate-800">
                  <span className="mr-1 text-emerald-600">✓</span>
                  {evo.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {channelLabel(evo.featureChannelContextId)} · Concluída ·{" "}
                  {formatDate(evo.completedDate ?? evo.expectedDate)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEvolution ? "Editar" : "Nova"} evolução
            </CardTitle>
            <CardDescription>
              Melhoria ligada a uma implementação (canal), com ciclo próprio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CrudForm
              key={editingEvolution?.id ?? "new-evo"}
              action={upsertFeatureEvolution}
              onSuccess={onCloseForm}
            >
              {editingEvolution ? (
                <input type="hidden" name="id" value={editingEvolution.id} />
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Implementação (canal)"
                  name="feature_channel_context_id"
                  as="select"
                  required
                  defaultValue={
                    editingEvolution?.featureChannelContextId ??
                    fccOptions[0]?.value
                  }
                  options={fccOptions}
                />
                <Field
                  label="Título"
                  name="title"
                  required
                  defaultValue={editingEvolution?.title}
                />
                <Field
                  label="Fase da evolução"
                  name="phase"
                  as="select"
                  required
                  defaultValue={editingEvolution?.phase ?? "UX_UI"}
                  options={evolutionPhaseOptions(true)}
                />
                <Field
                  label="Status"
                  name="status"
                  as="select"
                  required
                  defaultValue={editingEvolution?.status ?? "IN_PROGRESS"}
                  options={[
                    { value: "IN_PROGRESS", label: "Em andamento" },
                    { value: "PAUSED", label: "Pausada" },
                    { value: "DONE", label: "Concluída" },
                    { value: "CANCELLED", label: "Cancelada" },
                  ]}
                />
                <Field
                  label="Prioridade"
                  name="priority"
                  as="select"
                  defaultValue={editingEvolution?.priority ?? "MEDIUM"}
                  options={Object.entries(priorityLabel).map(
                    ([value, label]) => ({
                      value,
                      label,
                    }),
                  )}
                />
                <Field
                  label="Responsável"
                  name="responsible"
                  defaultValue={
                    editingEvolution?.responsible ?? feature.productOwner
                  }
                />
                <Field
                  label="Início"
                  name="start_date"
                  type="date"
                  defaultValue={editingEvolution?.startDate}
                />
                <Field
                  label="Previsão"
                  name="expected_date"
                  type="date"
                  defaultValue={editingEvolution?.expectedDate}
                />
              </div>
              <Field
                label="Descrição"
                name="description"
                as="textarea"
                defaultValue={editingEvolution?.description}
              />
              <Field
                label="Observações"
                name="notes"
                as="textarea"
                defaultValue={editingEvolution?.notes}
              />
              <Button type="button" variant="outline" onClick={onCloseForm}>
                Cancelar
              </Button>
            </CrudForm>
          </CardContent>
        </Card>
      ) : null}
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

function resolveInitialContextSelection(
  editingRoadmap: RoadmapItem | null | undefined,
  matrix: ChannelContextMatrixItem[],
) {
  if (!editingRoadmap?.channelContextId) {
    return { audienceIds: [] as string[], momentId: "", channelIds: [] as string[] };
  }
  const match = matrix.find((item) => item.id === editingRoadmap.channelContextId);
  if (!match) {
    return { audienceIds: [] as string[], momentId: "", channelIds: [] as string[] };
  }
  return {
    audienceIds: [match.audienceId],
    momentId: match.momentId,
    channelIds: [match.channelId],
  };
}

function RoadmapPhaseForm({
  feature,
  editingRoadmap,
  audienceOptions,
  momentOptions,
  channelOptions,
  channelContextMatrix,
  onSuccess,
  onCancel,
}: {
  feature: Feature;
  editingRoadmap: RoadmapItem | null | undefined;
  audienceOptions: Option[];
  momentOptions: Option[];
  channelOptions: Option[];
  channelContextMatrix: ChannelContextMatrixItem[];
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const initial = resolveInitialContextSelection(
    editingRoadmap,
    channelContextMatrix,
  );
  const [audienceIds, setAudienceIds] = useState(initial.audienceIds);
  const [momentId, setMomentId] = useState(initial.momentId);
  const [channelIds, setChannelIds] = useState(initial.channelIds);

  const availableChannelOptions = useMemo(() => {
    if (audienceIds.length === 0) return [];
    const allowed = new Set(
      channelContextMatrix
        .filter((item) => audienceIds.includes(item.audienceId))
        .map((item) => item.channelId),
    );
    return channelOptions.filter((option) => allowed.has(option.value));
  }, [audienceIds, channelContextMatrix, channelOptions]);

  function toggleAudience(id: string) {
    const next = audienceIds.includes(id)
      ? audienceIds.filter((v) => v !== id)
      : [...audienceIds, id];
    setAudienceIds(next);
    const allowed = new Set(
      channelContextMatrix
        .filter((item) => next.includes(item.audienceId))
        .map((item) => item.channelId),
    );
    setChannelIds((prev) => prev.filter((channelId) => allowed.has(channelId)));
  }

  function toggleChannel(id: string) {
    setChannelIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  return (
    <CrudForm action={upsertRoadmapItem} onSuccess={onSuccess}>
      {editingRoadmap ? (
        <input type="hidden" name="id" value={editingRoadmap.id} />
      ) : null}
      <input type="hidden" name="feature_id" value={feature.id} />
      {audienceIds.map((id) => (
        <input key={`aud-${id}`} type="hidden" name="audience_ids" value={id} />
      ))}
      {channelIds.map((id) => (
        <input key={`ch-${id}`} type="hidden" name="channel_ids" value={id} />
      ))}

      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Etapa"
          name="phase"
          as="select"
          required
          defaultValue={editingRoadmap?.phase ?? "BACKLOG"}
          options={featureStageOptions()}
        />
        <label className="block text-sm">
          <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
            Momento (opcional)
          </span>
          <select
            name="moment_id"
            value={momentId}
            onChange={(event) => setMomentId(event.target.value)}
            className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">Selecione…</option>
            {momentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <MultiCheckField
        label="Público (opcional)"
        options={audienceOptions}
        selected={audienceIds}
        onToggle={toggleAudience}
        emptyHint="Nenhum público cadastrado."
      />

      <MultiCheckField
        label="Canais (opcional)"
        options={availableChannelOptions}
        selected={channelIds}
        onToggle={toggleChannel}
        emptyHint={
          audienceIds.length === 0
            ? "Selecione ao menos um público para listar os canais."
            : "Nenhum canal disponível para o público selecionado."
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
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
          defaultValue={editingRoadmap?.responsible ?? feature.productOwner}
        />
      </div>
      <Field
        label="Observações"
        name="notes"
        as="textarea"
        defaultValue={editingRoadmap?.notes}
      />
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      ) : null}
    </CrudForm>
  );
}

function MultiCheckField({
  label,
  options,
  selected,
  onToggle,
  emptyHint,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyHint: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      {options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          {emptyHint}
        </p>
      ) : (
        <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onToggle(option.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  checked
                    ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
