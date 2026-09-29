"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Lightbulb, Loader2, UserRound, X } from "lucide-react";
import {
  createFeatureFromModal,
  ensureJourneyStagesForAudiences,
  extendNeedAudiences,
  linkExistingFeatureToJourney,
} from "@/app/actions/crud";
import { useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { appliesToAudience } from "@/lib/audiences";
import { PRODUCT_OPTIONS } from "@/lib/products";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types";

type Option = { value: string; label: string };
type JourneyOption = Option & { momentIds: string[] };
type NeedOption = Option & {
  journeyId: string;
  journeyStageId?: string | null;
  audienceIds?: string[];
};
type FeatureOption = Option & { description?: string };
type ChannelContextOption = {
  audienceId: string;
  momentId: string;
  channelId: string;
};
type JourneyStageOption = {
  audienceId: string;
  /** Jornada canônica (ex.: jrn-consorcio). */
  journeyId: string;
  /** Etapa (JourneyStage id). */
  journeyStageId?: string;
  momentId: string;
  displayName: string;
  sortOrder: number;
};

type StageSelectOption = {
  value: string;
  label: string;
  catalogJourneyId: string;
  momentId: string;
  sortOrder: number;
};

const STEPS = [
  { id: 1, label: "Contexto" },
  { id: 2, label: "Funcionalidade" },
  { id: 3, label: "Canais" },
  { id: 4, label: "Revisão" },
] as const;

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "CRITICAL", label: "Crítica" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Média" },
  { value: "LOW", label: "Baixa" },
];

function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              active
                ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                : "border-[var(--border)] bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MultiPillGroup({
  options,
  values,
  onChange,
}: {
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(
      values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              active
                ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600",
            )}
          >
            {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function NovaFuncionalidadeModal({
  open,
  onClose,
  audiences,
  moments,
  journeys,
  needs,
  channels,
  channelContexts = [],
  journeyAudienceStages = [],
  existingFeatures = [],
  initial,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  audiences: Option[];
  moments: Option[];
  journeys: JourneyOption[];
  needs: NeedOption[];
  channels: Option[];
  /** Contextos canal × público × momento (para filtrar canais por público). */
  channelContexts?: ChannelContextOption[];
  /** Etapas da jornada por público (para validar existência da etapa). */
  journeyAudienceStages?: JourneyStageOption[];
  /** Catálogo de funcionalidades já cadastradas (para autocomplete). */
  existingFeatures?: FeatureOption[];
  initial?: {
    audienceIds?: string[];
    momentId?: string;
    /** @deprecated Prefer journeyStageId — mantido como jornada canônica. */
    journeyId?: string;
    /** Etapa da jornada (JourneyStage id). */
    journeyStageId?: string;
    needId?: string;
    priority?: Priority;
    lockNeed?: boolean;
  };
  onCreated?: (featureId: string) => void;
}) {
  const { canEdit } = useAuth();
  const [step, setStep] = useState(1);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [momentId, setMomentId] = useState("");
  /** Etapa selecionada (JourneyStage id). */
  const [journeyStageId, setJourneyStageId] = useState("");
  const [needId, setNeedId] = useState("");
  const [priority, setPriority] = useState<Priority | "">("MEDIUM");
  const [featureName, setFeatureName] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  /** Canais selecionados por público. */
  const [channelsByAudience, setChannelsByAudience] = useState<
    Record<string, string[]>
  >({});
  /** Exibe erro de canal obrigatório só após tentativa de continuar. */
  const [channelsValidated, setChannelsValidated] = useState(false);
  const [productIds, setProductIds] = useState<string[]>(
    PRODUCT_OPTIONS.map((p) => p.value),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nameFocused, setNameFocused] = useState(false);
  const [pendingExisting, setPendingExisting] = useState<FeatureOption | null>(
    null,
  );
  const [pendingNeedExtend, setPendingNeedExtend] = useState<string[] | null>(
    null,
  );
  const [pendingMissingStages, setPendingMissingStages] = useState<
    string[] | null
  >(null);
  /** Públicos adicionados à necessidade nesta sessão (após confirmação). */
  const [needAudienceOverrides, setNeedAudienceOverrides] = useState<
    Record<string, string[]>
  >({});
  const needLocked = Boolean(initial?.lockNeed && initial?.needId);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setAudienceIds(initial?.audienceIds ?? []);
    setMomentId(initial?.momentId ?? "");
    const lockedNeed = initial?.needId
      ? needs.find((n) => n.value === initial.needId)
      : undefined;
    setJourneyStageId(
      initial?.journeyStageId ??
        lockedNeed?.journeyStageId ??
        "",
    );
    setNeedId(initial?.needId ?? "");
    setPriority(initial?.priority ?? "MEDIUM");
    setFeatureName("");
    setFeatureDesc("");
    setChannelsByAudience({});
    setChannelsValidated(false);
    setProductIds(PRODUCT_OPTIONS.map((p) => p.value));
    setSubmitError(null);
    setNameFocused(false);
    setPendingExisting(null);
    setPendingNeedExtend(null);
    setPendingMissingStages(null);
    setNeedAudienceOverrides({});
  }, [open, initial]);

  const stagesForMoment = useMemo((): StageSelectOption[] => {
    if (!momentId) return [];
    const byStage = new Map<string, StageSelectOption>();
    for (const stage of journeyAudienceStages) {
      if (stage.momentId !== momentId) continue;
      const stageId = stage.journeyStageId?.trim();
      if (!stageId) continue;
      if (byStage.has(stageId)) continue;
      byStage.set(stageId, {
        value: stageId,
        label: stage.displayName,
        catalogJourneyId: stage.journeyId,
        momentId: stage.momentId,
        sortOrder: stage.sortOrder,
      });
    }
    return Array.from(byStage.values()).sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "pt-BR"),
    );
  }, [journeyAudienceStages, momentId]);

  const selectedStage = useMemo(
    () => stagesForMoment.find((s) => s.value === journeyStageId) ?? null,
    [stagesForMoment, journeyStageId],
  );

  /** Jornada canônica resolvida a partir da etapa (para APIs). */
  const catalogJourneyId =
    selectedStage?.catalogJourneyId ??
    journeys.find((j) => j.momentIds.includes(momentId))?.value ??
    journeys[0]?.value ??
    "";

  const needsForStage = useMemo(() => {
    if (!journeyStageId) return [];
    return needs.filter((n) => n.journeyStageId === journeyStageId);
  }, [needs, journeyStageId]);

  const selectedNeed = useMemo(
    () => needs.find((n) => n.value === needId),
    [needs, needId],
  );

  const selectedNeedAudienceIds = useMemo(() => {
    const base = selectedNeed?.audienceIds;
    const extra = needId ? needAudienceOverrides[needId] : undefined;
    if (!extra?.length) return base;
    return Array.from(new Set([...(base ?? []), ...extra]));
  }, [selectedNeed, needId, needAudienceOverrides]);

  const missingAudienceIds = useMemo(() => {
    if (!needId || audienceIds.length === 0) return [];
    return audienceIds.filter(
      (aid) => !appliesToAudience(selectedNeedAudienceIds, aid),
    );
  }, [audienceIds, needId, selectedNeedAudienceIds]);

  const missingStageAudienceIds = useMemo(() => {
    if (!journeyStageId || !momentId || audienceIds.length === 0) return [];
    return audienceIds.filter(
      (aid) =>
        !journeyAudienceStages.some(
          (s) =>
            s.audienceId === aid &&
            s.journeyStageId === journeyStageId &&
            s.momentId === momentId,
        ),
    );
  }, [audienceIds, journeyStageId, momentId, journeyAudienceStages]);

  const stageTemplate = useMemo(() => {
    if (!journeyStageId || !momentId || !catalogJourneyId) return null;
    const existing = journeyAudienceStages.find(
      (s) => s.journeyStageId === journeyStageId && s.momentId === momentId,
    );
    return {
      journeyId: catalogJourneyId,
      journeyStageId,
      momentId,
      displayName:
        existing?.displayName ?? selectedStage?.label ?? journeyStageId,
      sortOrder: existing?.sortOrder ?? selectedStage?.sortOrder ?? 0,
    };
  }, [
    journeyStageId,
    momentId,
    catalogJourneyId,
    journeyAudienceStages,
    selectedStage,
  ]);

  const channelsGrouped = useMemo(() => {
    return audienceIds.map((audienceId) => {
      const label =
        audiences.find((a) => a.value === audienceId)?.label ?? audienceId;
      const channelIdsForAudience = momentId
        ? Array.from(
            new Set(
              channelContexts
                .filter(
                  (cc) =>
                    cc.audienceId === audienceId && cc.momentId === momentId,
                )
                .map((cc) => cc.channelId),
            ),
          )
        : [];

      // Fallback: se não houver contextos cadastrados, não listar canais genéricos
      // — só os vinculados ao público/momento.
      const options = channelIdsForAudience
        .map((id) => channels.find((c) => c.value === id))
        .filter((c): c is Option => Boolean(c));

      return { audienceId, label, options };
    });
  }, [audienceIds, audiences, channelContexts, channels, momentId]);

  const channelSelections = useMemo(
    () =>
      audienceIds.flatMap((audienceId) =>
        (channelsByAudience[audienceId] ?? []).map((channelId) => ({
          audienceId,
          channelId,
        })),
      ),
    [audienceIds, channelsByAudience],
  );

  const totalChannelsSelected = channelSelections.length;

  const audiencesMissingChannels = useMemo(
    () =>
      audienceIds.filter(
        (audienceId) => (channelsByAudience[audienceId] ?? []).length === 0,
      ),
    [audienceIds, channelsByAudience],
  );

  const featureSuggestions = useMemo(() => {
    const q = featureName.trim().toLocaleLowerCase("pt-BR");
    if (q.length < 1) return [];
    return existingFeatures
      .filter((f) => f.label.toLocaleLowerCase("pt-BR").includes(q))
      .slice(0, 8);
  }, [existingFeatures, featureName]);

  const showSuggestions =
    nameFocused && featureSuggestions.length > 0 && step === 2;

  useEffect(() => {
    if (!open || !journeyStageId) return;
    if (!stagesForMoment.some((s) => s.value === journeyStageId)) {
      setJourneyStageId("");
      if (!needLocked) setNeedId("");
    }
  }, [stagesForMoment, journeyStageId, open, needLocked]);

  useEffect(() => {
    if (!open || needLocked) return;
    if (needId && !needsForStage.some((n) => n.value === needId)) {
      setNeedId("");
    }
  }, [needsForStage, needId, open, needLocked]);

  // Remove seleções de canais de públicos desmarcados ou canais que saíram do contexto.
  useEffect(() => {
    if (!open) return;
    setChannelsByAudience((prev) => {
      const next: Record<string, string[]> = {};
      let changed = false;
      for (const audienceId of audienceIds) {
        const allowed = new Set(
          channelContexts
            .filter(
              (cc) =>
                cc.audienceId === audienceId &&
                (!momentId || cc.momentId === momentId),
            )
            .map((cc) => cc.channelId),
        );
        const current = prev[audienceId] ?? [];
        const filtered = current.filter((id) => allowed.has(id));
        if (filtered.length !== current.length) changed = true;
        if (filtered.length > 0) next[audienceId] = filtered;
        else if (current.length > 0) changed = true;
      }
      for (const key of Object.keys(prev)) {
        if (!audienceIds.includes(key)) changed = true;
      }
      return changed || Object.keys(prev).length !== Object.keys(next).length
        ? next
        : prev;
    });
  }, [open, audienceIds, momentId, channelContexts]);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(
        audienceIds.length > 0 &&
          momentId &&
          journeyStageId &&
          needId &&
          priority,
      );
    }
    if (step === 2) return Boolean(featureName.trim());
    if (step === 3) {
      // Produtos obrigatórios; canais são validados no clique de Continuar.
      return productIds.length > 0 && audienceIds.length > 0;
    }
    return true;
  }, [
    step,
    audienceIds,
    momentId,
    journeyStageId,
    needId,
    priority,
    featureName,
    productIds,
  ]);

  const channelsStepValid =
    audiencesMissingChannels.length === 0 && productIds.length > 0;

  if (!open || !canEdit) return null;

  const audienceLabel =
    audienceIds.length === 0
      ? "—"
      : audienceIds
          .map((id) => audiences.find((a) => a.value === id)?.label ?? id)
          .join(", ");
  const momentLabel = moments.find((m) => m.value === momentId)?.label ?? "—";
  const stageLabel = selectedStage?.label ?? "—";
  const needLabel = needs.find((n) => n.value === needId)?.label ?? "—";
  const priorityLabel =
    PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? "—";
  const channelsLabel =
    totalChannelsSelected === 0
      ? "—"
      : channelsGrouped
          .map((group) => {
            const selected = channelsByAudience[group.audienceId] ?? [];
            if (selected.length === 0) return null;
            const names = selected
              .map(
                (id) => channels.find((c) => c.value === id)?.label ?? id,
              )
              .join(", ");
            return `${group.label}: ${names}`;
          })
          .filter(Boolean)
          .join(" · ");
  const productsLabel =
    productIds.length === 0
      ? "—"
      : productIds
          .map(
            (id) => PRODUCT_OPTIONS.find((p) => p.value === id)?.label ?? id,
          )
          .join(", ");
  const missingAudienceLabels = (pendingNeedExtend ?? missingAudienceIds)
    .map((id) => audiences.find((a) => a.value === id)?.label ?? id)
    .join(", ");
  const missingStageLabels = (pendingMissingStages ?? missingStageAudienceIds)
    .map((id) => audiences.find((a) => a.value === id)?.label ?? id)
    .join(", ");

  function resetAndClose() {
    setStep(1);
    setAudienceIds([]);
    setMomentId("");
    setJourneyStageId("");
    setNeedId("");
    setPriority("MEDIUM");
    setFeatureName("");
    setFeatureDesc("");
    setChannelsByAudience({});
    setChannelsValidated(false);
    setProductIds(PRODUCT_OPTIONS.map((p) => p.value));
    setSubmitError(null);
    setNameFocused(false);
    setPendingExisting(null);
    setPendingNeedExtend(null);
    setPendingMissingStages(null);
    setNeedAudienceOverrides({});
    onClose();
  }

  function toggleChannel(audienceId: string, channelId: string) {
    setChannelsByAudience((prev) => {
      const current = prev[audienceId] ?? [];
      const next = current.includes(channelId)
        ? current.filter((x) => x !== channelId)
        : [...current, channelId];
      if (next.length === 0) {
        const { [audienceId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [audienceId]: next };
    });
  }

  function handleContinueFromChannels() {
    setChannelsValidated(true);
    if (!channelsStepValid || pending) return;
    setChannelsValidated(false);
    setStep(4);
  }

  function handleSelectExisting(feature: FeatureOption) {
    setFeatureName(feature.label);
    setFeatureDesc(feature.description ?? "");
    setNameFocused(false);
    setPendingExisting(feature);
  }

  function handleLinkExisting() {
    if (!pendingExisting || !needId || pending) return;
    setSubmitError(null);
    startTransition(async () => {
      const result = await linkExistingFeatureToJourney({
        featureId: pendingExisting.value,
        needId,
        journeyId: catalogJourneyId,
      });
      if (!result.ok) {
        setSubmitError(result.message);
        setPendingExisting(null);
        return;
      }
      if (result.id) onCreated?.(result.id);
      resetAndClose();
    });
  }

  function goToStep2() {
    setPendingNeedExtend(null);
    setPendingMissingStages(null);
    setStep(2);
  }

  function handleContinueFromStep1() {
    if (!canContinue || pending) return;
    const needMissing = missingAudienceIds;
    const stageMissing = missingStageAudienceIds;
    if (needMissing.length > 0 || stageMissing.length > 0) {
      setPendingNeedExtend(needMissing.length > 0 ? needMissing : null);
      setPendingMissingStages(stageMissing.length > 0 ? stageMissing : null);
      return;
    }
    goToStep2();
  }

  function handleConfirmExtendNeed() {
    if (pending) return;
    const needMissing = pendingNeedExtend ?? [];
    const stageMissing = pendingMissingStages ?? [];
    if (needMissing.length === 0 && stageMissing.length === 0) {
      goToStep2();
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      if (stageMissing.length > 0 && stageTemplate) {
        const stageResult = await ensureJourneyStagesForAudiences({
          journeyId: stageTemplate.journeyId,
          journeyStageId: stageTemplate.journeyStageId,
          momentId: stageTemplate.momentId,
          displayName: stageTemplate.displayName,
          sortOrder: stageTemplate.sortOrder,
          audienceIds: stageMissing,
        });
        if (!stageResult.ok) {
          setSubmitError(stageResult.message);
          setPendingNeedExtend(null);
          setPendingMissingStages(null);
          return;
        }
      }

      if (needMissing.length > 0 && needId) {
        const result = await extendNeedAudiences({
          needId,
          audienceIds: needMissing,
        });
        if (!result.ok) {
          setSubmitError(result.message);
          setPendingNeedExtend(null);
          setPendingMissingStages(null);
          return;
        }
        setNeedAudienceOverrides((prev) => ({
          ...prev,
          [needId]: Array.from(
            new Set([...(prev[needId] ?? []), ...needMissing]),
          ),
        }));
      }

      goToStep2();
    });
  }

  function handleCreate() {
    if (!canContinue || pending) return;
    setSubmitError(null);
    startTransition(async () => {
      const result = await createFeatureFromModal({
        audienceIds,
        momentId,
        journeyId: catalogJourneyId,
        needId,
        priority: priority || "MEDIUM",
        featureName,
        featureDesc,
        channelSelections,
        productIds,
      });
      if (!result.ok) {
        setSubmitError(result.message);
        return;
      }
      if (result.id) onCreated?.(result.id);
      resetAndClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/45"
          aria-label="Fechar modal"
          onClick={resetAndClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nova-func-title"
          className="relative z-[81] flex max-h-[min(100dvh,100%)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                Nova funcionalidade
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                  <UserRound className="h-4 w-4" />
                </span>
                <h2
                  id="nova-func-title"
                  className="truncate text-lg font-semibold text-slate-900 sm:text-xl"
                >
                  {STEPS[step - 1]?.label}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="shrink-0 border-b border-[var(--border)] px-4 py-3 sm:px-6">
            <ol className="flex items-center gap-2 sm:gap-4">
              {STEPS.map((s, idx) => {
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <li
                    key={s.id}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active || done
                          ? "bg-[var(--brand)] text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {s.id}
                    </span>
                    <span
                      className={cn(
                        "truncate text-xs font-medium sm:text-sm",
                        active
                          ? "text-[var(--brand)]"
                          : done
                            ? "text-slate-700"
                            : "text-slate-400",
                      )}
                    >
                      {s.label}
                    </span>
                    {idx < STEPS.length - 1 ? (
                      <span className="ml-auto hidden h-px flex-1 bg-slate-200 sm:block" />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {step === 1 ? (
              <>
                <div className="flex gap-3 rounded-xl border border-[var(--brand-ring)] bg-[var(--brand-soft)] px-4 py-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  <p className="text-sm leading-relaxed text-[var(--brand)]/90">
                    Antes de criar, responda: quem é o usuário, o que ele precisa
                    fazer e em qual momento da jornada isso acontece?
                  </p>
                </div>

                <Field
                  label="Público"
                  required
                  hint="Você pode selecionar mais de um público."
                >
                  <MultiPillGroup
                    options={audiences}
                    values={audienceIds}
                    onChange={setAudienceIds}
                  />
                </Field>

                <Field label="Momento" required>
                  <PillGroup
                    options={moments.map((m) => ({
                      value: m.value,
                      label: m.label,
                    }))}
                    value={momentId}
                    onChange={(value) => {
                      setMomentId(value);
                      setJourneyStageId("");
                      if (!needLocked) setNeedId("");
                    }}
                  />
                </Field>

                <Field
                  label="Etapa da jornada"
                  required
                  hint={
                    momentId
                      ? "Somente etapas do momento selecionado."
                      : "Selecione o momento para listar as etapas disponíveis."
                  }
                >
                  <select
                    value={journeyStageId}
                    onChange={(e) => {
                      setJourneyStageId(e.target.value);
                      if (!needLocked) setNeedId("");
                    }}
                    disabled={!momentId}
                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {momentId
                        ? "Selecionar..."
                        : "Selecione o momento primeiro"}
                    </option>
                    {stagesForMoment.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {momentId && stagesForMoment.length === 0 ? (
                    <p className="mt-1.5 text-xs text-amber-700">
                      Nenhuma etapa vinculada a este momento.
                    </p>
                  ) : null}
                </Field>

                <Field
                  label="Necessidade do usuário"
                  required
                  hint={
                    needLocked
                      ? "Definida pela necessidade de origem — não pode ser alterada."
                      : journeyStageId
                        ? "Somente necessidades já cadastradas nesta etapa."
                        : "Selecione a etapa da jornada para listar as necessidades."
                  }
                >
                  <select
                    value={needId}
                    onChange={(e) => setNeedId(e.target.value)}
                    disabled={!journeyStageId || needLocked}
                    className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">
                      {journeyStageId
                        ? "Selecionar..."
                        : "Selecione a etapa da jornada primeiro"}
                    </option>
                    {(needLocked
                      ? needs.filter((n) => n.value === needId)
                      : needsForStage
                    ).map((n) => (
                      <option key={n.value} value={n.value}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                  {!needLocked &&
                  journeyStageId &&
                  needsForStage.length === 0 ? (
                    <p className="mt-1.5 text-xs text-amber-700">
                      Nenhuma necessidade cadastrada nesta etapa.
                    </p>
                  ) : null}
                  {missingAudienceIds.length > 0 && needId ? (
                    <p className="mt-1.5 text-xs text-amber-700">
                      Esta necessidade ainda não está vinculada a:{" "}
                      {missingAudienceIds
                        .map(
                          (id) =>
                            audiences.find((a) => a.value === id)?.label ?? id,
                        )
                        .join(", ")}
                      .
                    </p>
                  ) : null}
                  {missingStageAudienceIds.length > 0 ? (
                    <p className="mt-1.5 text-xs text-amber-700">
                      A etapa &quot;{stageLabel}&quot; ainda não existe para:{" "}
                      {missingStageAudienceIds
                        .map(
                          (id) =>
                            audiences.find((a) => a.value === id)?.label ?? id,
                        )
                        .join(", ")}
                      .
                    </p>
                  ) : null}
                </Field>

                <Field label="Prioridade" required>
                  <PillGroup
                    options={PRIORITY_OPTIONS}
                    value={priority}
                    onChange={setPriority}
                  />
                </Field>

                {submitError &&
                pendingNeedExtend === null &&
                pendingMissingStages === null ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
                  >
                    {submitError}
                  </p>
                ) : null}
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Field
                  label="Nome da funcionalidade"
                  required
                  hint="Digite um nome novo ou selecione uma funcionalidade já existente."
                >
                  <div className="relative">
                    <input
                      value={featureName}
                      onChange={(e) => setFeatureName(e.target.value)}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setNameFocused(false), 150);
                      }}
                      placeholder='Ex: "Consultar situação da cota"'
                      autoComplete="off"
                      className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                    />
                    {showSuggestions ? (
                      <ul
                        role="listbox"
                        className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-white py-1 shadow-lg"
                      >
                        {featureSuggestions.map((feature) => (
                          <li key={feature.value} role="option">
                            <button
                              type="button"
                              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-[var(--brand-soft)]"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectExisting(feature)}
                            >
                              <span className="text-sm font-medium text-slate-900">
                                {feature.label}
                              </span>
                              {feature.description ? (
                                <span className="line-clamp-1 text-xs text-slate-500">
                                  {feature.description}
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--brand)]">
                                  Já cadastrada — clicar para reutilizar
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </Field>
                <Field label="Descrição">
                  <textarea
                    value={featureDesc}
                    onChange={(e) => setFeatureDesc(e.target.value)}
                    rows={4}
                    placeholder="Descreva o comportamento esperado da funcionalidade."
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                  />
                </Field>

                {submitError && pendingExisting === null ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
                  >
                    {submitError}
                  </p>
                ) : null}
              </>
            ) : null}

            {step === 3 ? (
              <div className="space-y-5">
                <Field
                  label="Produtos"
                  required
                  hint="A funcionalidade será criada para cada produto selecionado."
                >
                  <MultiPillGroup
                    options={PRODUCT_OPTIONS}
                    values={productIds}
                    onChange={setProductIds}
                  />
                </Field>
                <Field
                  label="Canais por público"
                  required
                  hint="Somente canais já vinculados a cada público no momento selecionado."
                >
                  <div className="max-h-72 space-y-4 overflow-y-auto">
                    {channelsGrouped.length === 0 ? (
                      <p className="rounded-xl border border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">
                        Selecione ao menos um público na etapa anterior.
                      </p>
                    ) : (
                      channelsGrouped.map((group) => {
                        const selected =
                          channelsByAudience[group.audienceId] ?? [];
                        const showError =
                          channelsValidated && selected.length === 0;
                        return (
                          <div
                            key={group.audienceId}
                            className={cn(
                              "rounded-xl border p-3",
                              showError
                                ? "border-rose-300 bg-rose-50/40"
                                : "border-[var(--border)]",
                            )}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">
                                {group.label}
                              </p>
                              {selected.length > 0 ? (
                                <span className="text-xs text-slate-500">
                                  {selected.length} selecionado
                                  {selected.length === 1 ? "" : "s"}
                                </span>
                              ) : null}
                            </div>
                            {group.options.length === 0 ? (
                              <p className="px-1 py-2 text-xs text-amber-700">
                                Nenhum canal cadastrado para este público neste
                                momento.
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {group.options.map((channel) => {
                                  const isSelected = selected.includes(
                                    channel.value,
                                  );
                                  return (
                                    <button
                                      key={channel.value}
                                      type="button"
                                      onClick={() =>
                                        toggleChannel(
                                          group.audienceId,
                                          channel.value,
                                        )
                                      }
                                      className={cn(
                                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                                        isSelected
                                          ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                                          : "text-slate-700 hover:bg-slate-50",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                          isSelected
                                            ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                                            : "border-slate-300 bg-white",
                                        )}
                                      >
                                        {isSelected ? (
                                          <Check className="h-3 w-3" />
                                        ) : null}
                                      </span>
                                      {channel.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {showError ? (
                              <p
                                role="alert"
                                className="mt-2 text-xs font-medium text-rose-600"
                              >
                                Selecione pelo menos 1 canal para{" "}
                                {group.label}.
                              </p>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                  {channelsValidated &&
                  audiencesMissingChannels.length > 0 ? (
                    <p role="alert" className="text-xs font-medium text-rose-600">
                      Cada público selecionado no contexto precisa de pelo menos
                      1 canal.
                    </p>
                  ) : totalChannelsSelected > 0 ? (
                    <p className="text-xs text-slate-500">
                      {totalChannelsSelected} par
                      {totalChannelsSelected === 1 ? "" : "es"} público × canal
                    </p>
                  ) : null}
                </Field>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-slate-50 p-4 text-sm">
                <Row label="Público" value={audienceLabel} />
                <Row label="Momento" value={momentLabel} />
                <Row label="Etapa da jornada" value={stageLabel} />
                <Row label="Necessidade" value={needLabel} />
                <Row label="Prioridade" value={priorityLabel} />
                <Row label="Funcionalidade" value={featureName || "—"} />
                <Row label="Descrição" value={featureDesc || "—"} />
                <Row label="Produtos" value={productsLabel} />
                <Row label="Canais" value={channelsLabel} />
                {submitError ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
                  >
                    {submitError}
                  </p>
                ) : (
                  <p className="pt-2 text-xs text-[var(--muted-foreground)]">
                    Ao confirmar, a funcionalidade será salva e vinculada aos
                    canais selecionados em cada público.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center justify-between gap-3 sm:contents">
              <button
                type="button"
                onClick={resetAndClose}
                disabled={pending}
                className="h-10 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <p className="text-xs text-[var(--muted-foreground)] sm:order-none">
                Etapa {step} de {STEPS.length}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (step === 3) setChannelsValidated(false);
                    setStep((s) => Math.max(1, s - 1));
                  }}
                  className="h-10 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>
              ) : null}
              {step < STEPS.length ? (
                <button
                  type="button"
                  disabled={!canContinue || pending}
                  onClick={() => {
                    if (step === 1) {
                      handleContinueFromStep1();
                      return;
                    }
                    if (step === 3) {
                      handleContinueFromChannels();
                      return;
                    }
                    setStep((s) => Math.min(STEPS.length, s + 1));
                  }}
                  className={cn(
                    "h-10 flex-1 rounded-lg px-4 text-sm font-medium text-white sm:flex-none",
                    canContinue && !pending
                      ? "bg-[var(--brand)] hover:opacity-90"
                      : "cursor-not-allowed bg-slate-300",
                  )}
                >
                  Continuar →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canContinue || pending}
                  onClick={handleCreate}
                  className={cn(
                    "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white sm:flex-none",
                    canContinue && !pending
                      ? "bg-[var(--brand)] hover:opacity-90"
                      : "cursor-not-allowed bg-slate-300",
                  )}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Salvando…
                    </>
                  ) : (
                    "Criar funcionalidade"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingExisting)}
        title="Adicionar funcionalidade existente?"
        description={
          pendingExisting
            ? `A funcionalidade "${pendingExisting.label}" já existe. Deseja adicioná-la à etapa "${stageLabel}" (necessidade "${needLabel}")?`
            : ""
        }
        confirmLabel={pending ? "Adicionando…" : "Sim, adicionar"}
        cancelLabel="Não, criar nova"
        onCancel={() => {
          if (pending) return;
          setPendingExisting(null);
        }}
        onConfirm={handleLinkExisting}
      />

      <ConfirmDialog
        open={Boolean(pendingNeedExtend || pendingMissingStages)}
        title={
          pendingMissingStages && !pendingNeedExtend
            ? "Adicionar etapa da jornada?"
            : pendingNeedExtend && !pendingMissingStages
              ? "Adicionar necessidade aos públicos?"
              : "Adicionar necessidade e etapa?"
        }
        description={(() => {
          const parts: string[] = [];
          if (pendingNeedExtend?.length) {
            parts.push(
              `A necessidade "${needLabel}" não está vinculada aos públicos: ${missingAudienceLabels}.`,
            );
          }
          if (pendingMissingStages?.length) {
            parts.push(
              `A etapa "${stageLabel}" ainda não existe para: ${missingStageLabels}.`,
            );
          }
          if (parts.length === 0) return "";
          return `${parts.join(" ")} Deseja adicionar ${
            pendingNeedExtend?.length && pendingMissingStages?.length
              ? "a necessidade e a etapa"
              : pendingMissingStages?.length
                ? "essa etapa"
                : "essa necessidade"
          } nesses públicos para continuar?`;
        })()}
        confirmLabel={pending ? "Adicionando…" : "Sim, adicionar"}
        cancelLabel="Não, voltar"
        onCancel={() => {
          if (pending) return;
          setPendingNeedExtend(null);
          setPendingMissingStages(null);
        }}
        onConfirm={handleConfirmExtendNeed}
      />
    </>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-800">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-slate-200/80 pb-2 last:border-0">
      <dt className="w-32 shrink-0 text-xs font-medium text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
