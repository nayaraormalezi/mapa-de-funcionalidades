"use client";

import {
  upsertChannelEvaluation,
  upsertEvidence,
  upsertFeature,
  upsertFeatureChannelContext,
  upsertFeatureEvolution,
  upsertGap,
  upsertIssue,
} from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { EvidenceFileField } from "@/components/feature/evidence-file-field";
import { ExperienceImageField } from "@/components/feature/experience-image-field";
import { MeasurementAndEvidenceFields } from "@/components/shared/measurement-and-evidence-fields";
import { ProductMultiSelect } from "@/components/shared/product-multi-select";
import {
  CONCEPT_LABEL,
  evidenceTypeLabel,
  evolutionPhaseOptions,
  experienceLabel,
  featureStageOptions,
  gapStatusLabel,
  gapTypeLabel,
  priorityLabel,
  temporalStatusLabel,
} from "@/lib/labels";
import {
  evolutionOriginLabel,
  normalizeEvolutionOrigin,
} from "@/lib/evolution";
import type {
  Evidence,
  EvolutionOrigin,
  Feature,
  FeatureEvolution,
  FeatureMapRow,
  Gap,
  TemporalStatus,
} from "@/types";
import { useState } from "react";
import { X } from "lucide-react";

type Option = { value: string; label: string };

function SheetModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
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
        className="relative z-[81] max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-[var(--border)] bg-white px-5 py-4">
          <div className="min-w-0">
            {subtitle ? (
              <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                {subtitle}
              </p>
            ) : null}
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">
              {title}
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
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function FeatureEditModal({
  feature,
  journeyOptions,
  needOptions,
  onClose,
}: {
  feature: Feature;
  journeyOptions: Option[];
  needOptions: Option[];
  onClose: () => void;
}) {
  return (
    <SheetModal
      title="Editar funcionalidade"
      subtitle="Ficha"
      onClose={onClose}
    >
      <CrudForm action={upsertFeature} onSuccess={onClose}>
        <input type="hidden" name="id" value={feature.id} />
        <input
          type="hidden"
          name="capability_id"
          value={feature.capabilityId ?? ""}
        />
        {feature.isDemo ? (
          <input type="hidden" name="is_demo" value="true" />
        ) : null}
        <input type="hidden" name="owner" value={feature.owner} />
        <input type="hidden" name="ux_owner" value={feature.uxOwner} />
        <input type="hidden" name="cx_owner" value={feature.cxOwner} />
        <input
          type="hidden"
          name="product_owner"
          value={feature.productOwner}
        />
        <Field label="Nome" name="name" defaultValue={feature.name} required />
        <Field
          label="Descrição"
          name="description"
          as="textarea"
          defaultValue={feature.description}
        />
        <Field
          label="Jornada"
          name="journey_ids"
          as="select"
          defaultValue={feature.journeyIds[0] ?? ""}
          options={[{ value: "", label: "—" }, ...journeyOptions]}
        />
        <Field
          label="Necessidade"
          name="need_ids"
          as="select"
          defaultValue={feature.needIds[0] ?? ""}
          options={[{ value: "", label: "—" }, ...needOptions]}
        />
        <ProductMultiSelect defaultSelected={feature.productIds} />
        <Field
          label="Prioridade"
          name="priority"
          as="select"
          defaultValue={feature.priority}
          options={Object.entries(priorityLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </CrudForm>
    </SheetModal>
  );
}

export function ContextEditModal({
  feature,
  journeyOptions,
  needOptions,
  onClose,
}: {
  feature: Feature;
  journeyOptions: Option[];
  needOptions: Option[];
  onClose: () => void;
}) {
  return (
    <SheetModal title="Editar contexto" subtitle="Contexto" onClose={onClose}>
      <CrudForm action={upsertFeature} onSuccess={onClose}>
        <input type="hidden" name="id" value={feature.id} />
        <input
          type="hidden"
          name="capability_id"
          value={feature.capabilityId ?? ""}
        />
        <input type="hidden" name="name" value={feature.name} />
        <input type="hidden" name="description" value={feature.description} />
        <input type="hidden" name="priority" value={feature.priority} />
        <input type="hidden" name="owner" value={feature.owner} />
        <input type="hidden" name="ux_owner" value={feature.uxOwner} />
        <input type="hidden" name="cx_owner" value={feature.cxOwner} />
        <input
          type="hidden"
          name="product_owner"
          value={feature.productOwner}
        />
        {feature.isDemo ? (
          <input type="hidden" name="is_demo" value="true" />
        ) : null}
        <Field
          label="Jornada"
          name="journey_ids"
          as="select"
          defaultValue={feature.journeyIds[0] ?? ""}
          options={[{ value: "", label: "—" }, ...journeyOptions]}
        />
        <Field
          label="Necessidade"
          name="need_ids"
          as="select"
          defaultValue={feature.needIds[0] ?? ""}
          options={[{ value: "", label: "—" }, ...needOptions]}
        />
        <ProductMultiSelect defaultSelected={feature.productIds} />
        <p className="text-xs text-slate-500">
          Público e momento são definidos por implementação (canal). Edite no
          card do canal correspondente.
        </p>
      </CrudForm>
    </SheetModal>
  );
}

export function ImplementationEditModal({
  featureId,
  context,
  implementations = [],
  channelContextMatrix,
  audienceOptions,
  momentOptions,
  channelOptions,
  productOptions,
  mode = "full",
  onClose,
}: {
  featureId: string;
  context?: FeatureMapRow | null;
  implementations?: {
    fccId: string;
    productId: string;
    shortName: string;
  }[];
  channelContextMatrix: {
    id: string;
    audienceId: string;
    momentId: string;
    channelId: string;
    temporalStatus: string;
  }[];
  audienceOptions: Option[];
  momentOptions: Option[];
  channelOptions: Option[];
  productOptions: Option[];
  mode?: "full" | "figma" | "screenshot";
  onClose: () => void;
}) {
  const isNew = !context;
  const lockChannel = Boolean(context);
  const [phase, setPhase] = useState(context?.phase ?? "BACKLOG");
  const [launchDate, setLaunchDate] = useState(
    context?.launchDate?.slice(0, 10) ?? "",
  );
  const [audienceId, setAudienceId] = useState(context?.audienceId ?? "");
  const [momentId, setMomentId] = useState(context?.momentId ?? "");
  const [channelContextId, setChannelContextId] = useState(
    context?.channelContextId ?? "",
  );

  const title =
    mode === "figma"
      ? "Figma e screenshot"
      : mode === "screenshot"
        ? "Screenshot da experiência"
        : isNew
          ? "Adicionar canal"
          : "Editar implementação";

  function handlePhaseChange(next: string) {
    const prev = phase;
    setPhase(next as typeof phase);
    if (next === "AVAILABLE" && (prev === "BACKLOG" || !launchDate)) {
      setLaunchDate(new Date().toISOString().slice(0, 10));
    }
  }

  const audienceSelectOptions = audienceOptions.filter((o) =>
    channelContextMatrix.some((cc) => cc.audienceId === o.value),
  );

  const momentSelectOptions = momentOptions.filter((o) =>
    channelContextMatrix.some(
      (cc) =>
        cc.momentId === o.value &&
        (!audienceId || cc.audienceId === audienceId),
    ),
  );

  const channelSelectOptions = channelContextMatrix
    .filter(
      (cc) =>
        (!audienceId || cc.audienceId === audienceId) &&
        (!momentId || cc.momentId === momentId),
    )
    .map((cc) => {
      const channelName =
        channelOptions.find((o) => o.value === cc.channelId)?.label ??
        cc.channelId;
      const status =
        temporalStatusLabel[cc.temporalStatus as TemporalStatus] ??
        cc.temporalStatus;
      return {
        value: cc.id,
        label: `${channelName} (${status})`,
      };
    });

  function handleAudienceChange(next: string) {
    setAudienceId(next);
    const stillValidMoment = channelContextMatrix.some(
      (cc) => cc.audienceId === next && cc.momentId === momentId,
    );
    const nextMoment = stillValidMoment ? momentId : "";
    setMomentId(nextMoment);
    const stillValidContext = channelContextMatrix.some(
      (cc) =>
        cc.id === channelContextId &&
        cc.audienceId === next &&
        (!nextMoment || cc.momentId === nextMoment),
    );
    if (!stillValidContext) setChannelContextId("");
  }

  function handleMomentChange(next: string) {
    setMomentId(next);
    const stillValidContext = channelContextMatrix.some(
      (cc) =>
        cc.id === channelContextId &&
        (!audienceId || cc.audienceId === audienceId) &&
        cc.momentId === next,
    );
    if (!stillValidContext) setChannelContextId("");
  }

  const defaultProductIds =
    implementations.length > 0
      ? implementations.map((i) => i.productId)
      : context?.productId
        ? [context.productId]
        : ["imobiliario"];

  return (
    <SheetModal
      title={title}
      subtitle="Disponibilidade por canal"
      onClose={onClose}
    >
      <CrudForm action={upsertFeatureChannelContext} onSuccess={onClose}>
        {context ? (
          <input type="hidden" name="id" value={context.featureChannelContextId} />
        ) : null}
        <input type="hidden" name="feature_id" value={featureId} />
        {mode === "figma" ? (
          <input type="hidden" name="require_experience_pair" value="true" />
        ) : null}
        {mode === "full" ? (
          <>
            {lockChannel ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Público
                    </p>
                    <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
                      {context?.audienceName ?? "—"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Etapa
                    </p>
                    <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
                      {context?.momentName ?? "—"}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                      Canal
                    </p>
                    <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
                      {context?.channelName ?? "—"}
                    </p>
                  </div>
                </div>
                <input
                  type="hidden"
                  name="channel_context_id"
                  value={context?.channelContextId ?? ""}
                />
              </>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-sm">
                  <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Público
                  </span>
                  <select
                    value={audienceId}
                    required
                    onChange={(e) => handleAudienceChange(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  >
                    <option value="">Selecione…</option>
                    {audienceSelectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Etapa
                  </span>
                  <select
                    value={momentId}
                    required
                    disabled={!audienceId}
                    onChange={(e) => handleMomentChange(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">Selecione…</option>
                    {momentSelectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                    Canal
                  </span>
                  <select
                    name="channel_context_id"
                    value={channelContextId}
                    required
                    disabled={!audienceId || !momentId}
                    onChange={(e) => setChannelContextId(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">Selecione…</option>
                    {channelSelectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <ProductMultiSelect
              required
              options={productOptions}
              defaultSelected={defaultProductIds}
              hint="Uma disponibilidade será criada/atualizada para cada produto selecionado."
            />
            <label className="block text-sm">
              <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                Status / fase
              </span>
              <select
                name="phase"
                value={phase}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {featureStageOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Responsável"
              name="responsible"
              defaultValue={context?.responsible}
            />
            <Field
              label="Ticket TI"
              name="ticket_number"
              defaultValue={context?.ticketNumber ?? ""}
              placeholder="Ex.: CHM-123456"
              hint="Número do chamado/ticket aberto para acompanhamento da implementação junto à TI."
            />
            <Field
              label="Início"
              name="start_date"
              type="date"
              defaultValue={context?.startDate?.slice(0, 10)}
            />
            <Field
              label="Previsão de disponibilidade"
              name="expected_date"
              type="date"
              defaultValue={context?.expectedDate?.slice(0, 10)}
            />
            {phase === "AVAILABLE" ? (
              <label className="block text-sm">
                <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Disponível desde
                </span>
                <input
                  type="date"
                  name="launch_date"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
              </label>
            ) : (
              <input type="hidden" name="launch_date" value={launchDate} />
            )}
            <Field
              label="Notas / motivo"
              name="notes"
              as="textarea"
              defaultValue={context?.notes}
            />
          </>
        ) : (
          <>
            <input
              type="hidden"
              name="channel_context_id"
              value={context?.channelContextId ?? ""}
            />
            <input
              type="hidden"
              name="product_id"
              value={context?.productId ?? ""}
            />
            <input type="hidden" name="phase" value={context?.phase ?? "BACKLOG"} />
            <input
              type="hidden"
              name="responsible"
              value={context?.responsible ?? ""}
            />
            <input
              type="hidden"
              name="expected_date"
              value={context?.expectedDate?.slice(0, 10) ?? ""}
            />
            <input
              type="hidden"
              name="launch_date"
              value={context?.launchDate?.slice(0, 10) ?? ""}
            />
            <input
              type="hidden"
              name="start_date"
              value={context?.startDate?.slice(0, 10) ?? ""}
            />
            <input type="hidden" name="notes" value={context?.notes ?? ""} />
            <input
              type="hidden"
              name="ticket_number"
              value={context?.ticketNumber ?? ""}
            />
            <input
              type="hidden"
              name="experience"
              value={context?.experience ?? "NOT_EVALUATED"}
            />
            <input
              type="hidden"
              name="experience_url"
              value={context?.experienceUrl ?? ""}
            />
          </>
        )}

        {(mode === "full" || mode === "figma") && (
          <Field
            label="Link do Figma"
            name="figma_url"
            required={mode === "figma"}
            defaultValue={context?.figmaUrl ?? ""}
          />
        )}

        {(mode === "full" || mode === "figma" || mode === "screenshot") && (
          <ExperienceImageField
            existingUrl={context?.experienceImageUrl}
            required={mode === "figma" || mode === "screenshot"}
            label={
              mode === "figma"
                ? "Screenshot da experiência"
                : "Screenshot da experiência"
            }
            hint={
              mode === "figma"
                ? "Obrigatório ao cadastrar o Figma · JPG, PNG, WEBP ou GIF · até 10 MB"
                : "JPG, PNG, WEBP ou GIF · até 10 MB"
            }
          />
        )}

        {mode === "full" ? (
          <Field
            label="Link da experiência"
            name="experience_url"
            defaultValue={context?.experienceUrl ?? ""}
          />
        ) : mode === "screenshot" ? (
          <input
            type="hidden"
            name="figma_url"
            value={context?.figmaUrl ?? ""}
          />
        ) : null}
      </CrudForm>
    </SheetModal>
  );
}

export function EvolutionEditModal({
  evolution,
  fccOptions,
  featureId: _featureId,
  defaults,
  onClose,
}: {
  evolution?: FeatureEvolution | null;
  fccOptions: Option[];
  featureId: string;
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
    /** Origem explícita do CTA (obrigatória na criação). */
    origin?: EvolutionOrigin;
    implementations?: {
      fccId: string;
      productId: string;
      shortName: string;
    }[];
  };
  onClose: () => void;
}) {
  const implementations = defaults?.implementations ?? [];
  const lockChannel = Boolean(defaults?.lockChannel) && !evolution;
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    implementations.map((i) => i.productId),
  );

  const selectedFccIds = implementations
    .filter((i) => selectedProductIds.includes(i.productId))
    .map((i) => i.fccId);

  const resolvedOrigin = normalizeEvolutionOrigin(
    evolution?.origin ?? defaults?.origin ?? "MANUAL",
  );
  /** Origem vem do sinal/CTA ou do registro; não é editável no formulário. */
  const originLocked = true;

  return (
    <SheetModal
      title={evolution ? "Editar evolução" : "Adicionar evolução"}
      subtitle="Evoluções"
      onClose={onClose}
    >
      <CrudForm action={upsertFeatureEvolution} onSuccess={onClose}>
        {evolution ? (
          <input type="hidden" name="id" value={evolution.id} />
        ) : null}
        <input type="hidden" name="feature_id" value={_featureId} />
        <input type="hidden" name="origin" value={resolvedOrigin} />

        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
            Origem
          </p>
          <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
            {evolutionOriginLabel[resolvedOrigin]}
            {originLocked && !evolution ? (
              <span className="ml-2 text-xs text-slate-500">
                (definida pelo fluxo de criação)
              </span>
            ) : null}
          </p>
        </div>

        {lockChannel ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Público
                </p>
                <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {defaults?.audienceName ?? "—"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Etapa
                </p>
                <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {defaults?.momentName ?? "—"}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Canal
                </p>
                <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {defaults?.channelName ??
                    defaults?.channelLabel ??
                    "—"}
                </p>
              </div>
            </div>
            <ProductMultiSelect
              required
              options={implementations.map((i) => ({
                value: i.productId,
                label: i.shortName,
              }))}
              selected={selectedProductIds}
              onChange={setSelectedProductIds}
              hint="A evolução será criada para cada produto selecionado neste canal."
            />
            <input
              type="hidden"
              name="fcc_ids"
              value={selectedFccIds.join(",")}
            />
            <input
              type="hidden"
              name="feature_channel_context_id"
              value={selectedFccIds[0] ?? defaults?.featureChannelContextId ?? ""}
            />
          </>
        ) : (
          <Field
            label="Implementação (canal · produto)"
            name="feature_channel_context_id"
            as="select"
            required
            defaultValue={
              evolution?.featureChannelContextId ??
              defaults?.featureChannelContextId
            }
            options={fccOptions}
          />
        )}

        <Field
          label="Título"
          name="title"
          required
          defaultValue={evolution?.title ?? defaults?.title}
        />
        <Field
          label="Descrição"
          name="description"
          as="textarea"
          defaultValue={evolution?.description ?? defaults?.description}
        />
        <Field
          label="Fase"
          name="phase"
          as="select"
          defaultValue={evolution?.phase ?? defaults?.phase ?? "UX_UI"}
          options={evolutionPhaseOptions()}
        />
        <Field
          label="Prioridade"
          name="priority"
          as="select"
          defaultValue={evolution?.priority ?? "HIGH"}
          options={Object.entries(priorityLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Previsão"
          name="expected_date"
          type="date"
          defaultValue={evolution?.expectedDate?.slice(0, 10)}
        />
        <Field
          label="Responsável"
          name="responsible"
          defaultValue={evolution?.responsible}
        />
        <MeasurementAndEvidenceFields
          measurementDefault={evolution?.measurement}
          measurementHint="Como saberemos se essa evolução gerou o resultado esperado."
        />
      </CrudForm>
    </SheetModal>
  );
}

export function ChannelEvaluationModal({
  featureId,
  context,
  fccIds,
  channelName,
  onClose,
}: {
  featureId: string;
  context: FeatureMapRow;
  fccIds: string[];
  channelName: string;
  onClose: () => void;
}) {
  const [needsEvolution, setNeedsEvolution] = useState(
    Boolean(context.needsEvolution),
  );

  return (
    <SheetModal
      title="Avaliação da experiência"
      subtitle={channelName}
      onClose={onClose}
    >
      <CrudForm
        action={upsertChannelEvaluation}
        submitLabel="Salvar avaliação"
        onSuccess={onClose}
      >
        <input type="hidden" name="feature_id" value={featureId} />
        <input type="hidden" name="fcc_ids" value={fccIds.join(",")} />
        <input type="hidden" name="id" value={context.featureChannelContextId} />
        <input
          type="hidden"
          name="needs_evolution"
          value={needsEvolution ? "true" : "false"}
        />

        <Field
          label="Avaliação (legado)"
          name="experience"
          as="select"
          required
          defaultValue={context.experience ?? "NOT_EVALUATED"}
          options={Object.entries(experienceLabel).map(([value, label]) => ({
            value,
            label,
          }))}
          hint="Campo legado. A saúde oficial vem das Avaliações (Evaluation → Intelligence). Ausência de avaliação ≠ nota ruim."
        />
        <Field
          label="Notas da avaliação"
          name="evaluation_notes"
          as="textarea"
          defaultValue={context.evaluationNotes ?? ""}
        />
        <Field
          label="Data do resultado de pesquisa"
          name="research_date"
          type="date"
          defaultValue={context.researchDate?.slice(0, 10) ?? ""}
        />
        <EvidenceFileField
          label="Resultado de pesquisa (PDF ou imagem)"
          inputName="research_file"
          removeName="remove_research_file"
          existingFileName={context.researchFileName}
          existingFileMime={context.researchFileMime}
          existingFileSize={context.researchFileSize}
          existingFileUrl={context.researchFileUrl}
        />

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
            Precisa de evolução?
          </legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNeedsEvolution(true)}
              className={
                needsEvolution
                  ? "rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3.5 py-1.5 text-sm font-medium text-[var(--brand)]"
                  : "rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-sm text-slate-500"
              }
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setNeedsEvolution(false)}
              className={
                !needsEvolution
                  ? "rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-3.5 py-1.5 text-sm font-medium text-[var(--brand)]"
                  : "rounded-full border border-slate-200 bg-slate-100 px-3.5 py-1.5 text-sm text-slate-500"
              }
            >
              Não
            </button>
          </div>
        </fieldset>
      </CrudForm>
    </SheetModal>
  );
}

export function EvidenceEditModal({
  evidence,
  featureId,
  evaluationId,
  evaluationName,
  onClose,
}: {
  evidence?: Evidence | null;
  featureId: string;
  /** Quando definido, owner canônico = EVALUATION. */
  evaluationId?: string | null;
  evaluationName?: string | null;
  onClose: () => void;
}) {
  const ownerType = evaluationId ? "EVALUATION" : "FEATURE";
  const ownerId = evaluationId ?? featureId;

  return (
    <SheetModal
      title={evidence ? "Editar evidência" : "Adicionar evidência"}
      subtitle="Evidências"
      onClose={onClose}
    >
      <CrudForm action={upsertEvidence} onSuccess={onClose}>
        {evidence ? <input type="hidden" name="id" value={evidence.id} /> : null}
        <input type="hidden" name="feature_id" value={featureId} />
        <input type="hidden" name="owner_type" value={ownerType} />
        <input type="hidden" name="owner_id" value={ownerId} />
        {evaluationId ? (
          <input type="hidden" name="evaluation_id" value={evaluationId} />
        ) : null}

        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
            Relacionada a
          </p>
          <p className="rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-sm text-slate-800">
            {ownerType === "EVALUATION"
              ? `Avaliação${evaluationName ? `: ${evaluationName}` : ""}`
              : "Funcionalidade (geral)"}
          </p>
        </div>

        <Field
          label="Título"
          name="title"
          required
          defaultValue={evidence?.title}
        />
        <Field
          label="Tipo"
          name="type"
          as="select"
          defaultValue={evidence?.type ?? "UX_RESEARCH"}
          options={Object.entries(evidenceTypeLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Descrição"
          name="description"
          as="textarea"
          defaultValue={evidence?.description}
        />
        <Field
          label="Link"
          name="link"
          defaultValue={evidence?.link ?? ""}
        />
        <Field
          label="Data"
          name="date"
          type="date"
          defaultValue={evidence?.date?.slice(0, 10)}
        />
        <Field
          label="Responsável"
          name="responsible"
          defaultValue={evidence?.responsible}
        />
      </CrudForm>
    </SheetModal>
  );
}

export function IssueEditModal({
  issue,
  featureId,
  audienceOptions,
  momentOptions,
  journeyOptions,
  needOptions,
  channelOptions,
  onClose,
}: {
  issue?: Gap | null;
  featureId: string;
  audienceOptions: Option[];
  momentOptions: Option[];
  journeyOptions: Option[];
  needOptions: Option[];
  channelOptions: Option[];
  onClose: () => void;
}) {
  return (
    <SheetModal
      title={
        issue
          ? `Editar ${CONCEPT_LABEL.issue.toLowerCase()}`
          : `Adicionar ${CONCEPT_LABEL.issue.toLowerCase()}`
      }
      subtitle={CONCEPT_LABEL.issues}
      onClose={onClose}
    >
      <CrudForm action={upsertIssue} onSuccess={onClose}>
        {issue ? <input type="hidden" name="id" value={issue.id} /> : null}
        <input type="hidden" name="feature_id" value={featureId} />
        <Field
          label="Título"
          name="title"
          required
          defaultValue={issue?.title}
        />
        <Field
          label="Descrição"
          name="description"
          as="textarea"
          defaultValue={issue?.description}
        />
        <Field
          label="Tipo"
          name="type"
          as="select"
          defaultValue={issue?.type ?? "EXPERIENCE"}
          options={Object.entries(gapTypeLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Prioridade"
          name="priority"
          as="select"
          defaultValue={issue?.priority ?? "HIGH"}
          options={Object.entries(priorityLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Impacto"
          name="impact"
          as="select"
          defaultValue={issue?.impact ?? "HIGH"}
          options={Object.entries(priorityLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Status"
          name="status"
          as="select"
          defaultValue={issue?.status ?? "OPEN"}
          options={Object.entries(gapStatusLabel).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Field
          label="Público"
          name="audience_id"
          as="select"
          required
          defaultValue={issue?.audienceId}
          options={audienceOptions}
        />
        <Field
          label="Momento"
          name="moment_id"
          as="select"
          required
          defaultValue={issue?.momentId}
          options={momentOptions}
        />
        <Field
          label="Jornada"
          name="journey_id"
          as="select"
          required
          defaultValue={issue?.journeyId}
          options={journeyOptions}
        />
        <Field
          label="Necessidade"
          name="user_need_id"
          as="select"
          required
          defaultValue={issue?.userNeedId}
          options={needOptions}
        />
        <Field
          label="Canal atual"
          name="current_channel_id"
          as="select"
          defaultValue={issue?.currentChannelId ?? ""}
          options={[{ value: "", label: "—" }, ...channelOptions]}
        />
        <Field
          label="Responsável"
          name="responsible"
          defaultValue={issue?.responsible}
        />
      </CrudForm>
    </SheetModal>
  );
}

/** @deprecated Fase 12 — preferir `IssueEditModal`. */
export function GapEditModal({
  gap,
  ...rest
}: {
  gap?: Gap | null;
  featureId: string;
  audienceOptions: Option[];
  momentOptions: Option[];
  journeyOptions: Option[];
  needOptions: Option[];
  channelOptions: Option[];
  onClose: () => void;
}) {
  return <IssueEditModal issue={gap} {...rest} />;
}
