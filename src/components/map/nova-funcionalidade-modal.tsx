"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Lightbulb, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types";

type Option = { value: string; label: string };
type JourneyOption = Option & { momentIds: string[] };
type NeedOption = Option & { journeyId: string };

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
                : "border-[var(--border)] bg-white text-slate-600 hover:border-slate-300",
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
  initial,
}: {
  open: boolean;
  onClose: () => void;
  audiences: Option[];
  moments: Option[];
  journeys: JourneyOption[];
  needs: NeedOption[];
  channels: Option[];
  initial?: {
    audienceIds?: string[];
    momentId?: string;
    journeyId?: string;
    needId?: string;
    priority?: Priority;
    lockNeed?: boolean;
  };
}) {
  const [step, setStep] = useState(1);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [momentId, setMomentId] = useState("");
  const [journeyId, setJourneyId] = useState("");
  const [needId, setNeedId] = useState("");
  const [priority, setPriority] = useState<Priority | "">("MEDIUM");
  const [featureName, setFeatureName] = useState("");
  const [featureDesc, setFeatureDesc] = useState("");
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const needLocked = Boolean(initial?.lockNeed && initial?.needId);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setAudienceIds(initial?.audienceIds ?? []);
    setMomentId(initial?.momentId ?? "");
    setJourneyId(initial?.journeyId ?? "");
    setNeedId(initial?.needId ?? "");
    setPriority(initial?.priority ?? "MEDIUM");
    setFeatureName("");
    setFeatureDesc("");
    setChannelIds([]);
  }, [open, initial]);

  const journeysForMoment = useMemo(() => {
    if (!momentId) return [];
    return journeys.filter((j) => j.momentIds.includes(momentId));
  }, [journeys, momentId]);

  const needsForJourney = useMemo(() => {
    if (!journeyId) return [];
    return needs.filter((n) => n.journeyId === journeyId);
  }, [needs, journeyId]);

  useEffect(() => {
    if (!open || !journeyId) return;
    if (!journeysForMoment.some((j) => j.value === journeyId)) {
      setJourneyId("");
      if (!needLocked) setNeedId("");
    }
  }, [journeysForMoment, journeyId, open, needLocked]);

  useEffect(() => {
    if (!open || needLocked) return;
    if (needId && !needsForJourney.some((n) => n.value === needId)) {
      setNeedId("");
    }
  }, [needsForJourney, needId, open, needLocked]);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(
        audienceIds.length > 0 &&
          momentId &&
          journeyId &&
          needId &&
          priority,
      );
    }
    if (step === 2) return Boolean(featureName.trim());
    if (step === 3) return channelIds.length > 0;
    return true;
  }, [
    step,
    audienceIds,
    momentId,
    journeyId,
    needId,
    priority,
    featureName,
    channelIds,
  ]);

  if (!open) return null;

  const audienceLabel =
    audienceIds.length === 0
      ? "—"
      : audienceIds
          .map((id) => audiences.find((a) => a.value === id)?.label ?? id)
          .join(", ");
  const momentLabel = moments.find((m) => m.value === momentId)?.label ?? "—";
  const journeyLabel =
    journeys.find((j) => j.value === journeyId)?.label ?? "—";
  const needLabel = needs.find((n) => n.value === needId)?.label ?? "—";
  const priorityLabel =
    PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? "—";
  const channelsLabel =
    channelIds.length === 0
      ? "—"
      : channelIds
          .map((id) => channels.find((c) => c.value === id)?.label ?? id)
          .join(", ");

  function resetAndClose() {
    setStep(1);
    setAudienceIds([]);
    setMomentId("");
    setJourneyId("");
    setNeedId("");
    setPriority("MEDIUM");
    setFeatureName("");
    setFeatureDesc("");
    setChannelIds([]);
    onClose();
  }

  function toggleChannel(id: string) {
    setChannelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
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
        className="relative z-[81] flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-6 pt-5 pb-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Nova funcionalidade
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                <UserRound className="h-4 w-4" />
              </span>
              <h2
                id="nova-func-title"
                className="text-xl font-semibold text-slate-900"
              >
                {STEPS[step - 1]?.label}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[var(--border)] px-6 py-3">
          <ol className="flex items-center gap-2 sm:gap-4">
            {STEPS.map((s, idx) => {
              const active = step === s.id;
              const done = step > s.id;
              return (
                <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
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

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
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
                    setJourneyId("");
                    if (!needLocked) setNeedId("");
                  }}
                />
              </Field>

              <Field
                label="Jornada"
                required
                hint={
                  momentId
                    ? "Somente jornadas do momento selecionado."
                    : "Selecione o momento para listar as jornadas disponíveis."
                }
              >
                <select
                  value={journeyId}
                  onChange={(e) => {
                    setJourneyId(e.target.value);
                    if (!needLocked) setNeedId("");
                  }}
                  disabled={!momentId}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {momentId ? "Selecionar..." : "Selecione o momento primeiro"}
                  </option>
                  {journeysForMoment.map((j) => (
                    <option key={j.value} value={j.value}>
                      {j.label}
                    </option>
                  ))}
                </select>
                {momentId && journeysForMoment.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Nenhuma jornada vinculada a este momento.
                  </p>
                ) : null}
              </Field>

              <Field
                label="Necessidade do usuário"
                required
                hint={
                  needLocked
                    ? "Definida pela necessidade de origem — não pode ser alterada."
                    : journeyId
                      ? "Somente necessidades já cadastradas nesta jornada."
                      : "Selecione a jornada para listar as necessidades."
                }
              >
                <select
                  value={needId}
                  onChange={(e) => setNeedId(e.target.value)}
                  disabled={!journeyId || needLocked}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">
                    {journeyId
                      ? "Selecionar..."
                      : "Selecione a jornada primeiro"}
                  </option>
                  {(needLocked
                    ? needs.filter((n) => n.value === needId)
                    : needsForJourney
                  ).map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </select>
                {!needLocked && journeyId && needsForJourney.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-700">
                    Nenhuma necessidade cadastrada nesta jornada.
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
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Nome da funcionalidade" required>
                <input
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  placeholder='Ex: "Consultar situação da cota"'
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
                />
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
            </>
          ) : null}

          {step === 3 ? (
            <Field
              label="Canais"
              required
              hint="Selecione os canais já cadastrados em que a funcionalidade deve existir."
            >
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
                {channels.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[var(--muted-foreground)]">
                    Nenhum canal cadastrado.
                  </p>
                ) : (
                  channels.map((channel) => {
                    const selected = channelIds.includes(channel.value);
                    return (
                      <button
                        key={channel.value}
                        type="button"
                        onClick={() => toggleChannel(channel.value)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                          selected
                            ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                              : "border-slate-300 bg-white",
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                        {channel.label}
                      </button>
                    );
                  })
                )}
              </div>
              {channelIds.length > 0 ? (
                <p className="text-xs text-slate-500">
                  {channelIds.length} canal
                  {channelIds.length === 1 ? "" : "is"} selecionado
                  {channelIds.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </Field>
          ) : null}

          {step === 4 ? (
            <div className="space-y-3 rounded-xl border border-[var(--border)] bg-slate-50 p-4 text-sm">
              <Row label="Público" value={audienceLabel} />
              <Row label="Momento" value={momentLabel} />
              <Row label="Jornada" value={journeyLabel} />
              <Row label="Necessidade" value={needLabel} />
              <Row label="Prioridade" value={priorityLabel} />
              <Row label="Funcionalidade" value={featureName || "—"} />
              <Row label="Descrição" value={featureDesc || "—"} />
              <Row label="Canais" value={channelsLabel} />
              <p className="pt-2 text-xs text-[var(--muted-foreground)]">
                Para persistir no banco, conclua no cadastro completo de
                funcionalidades.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            className="h-10 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <p className="text-xs text-[var(--muted-foreground)]">
            Etapa {step} de {STEPS.length}
          </p>
          <div className="flex items-center gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="h-10 rounded-lg border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>
            ) : null}
            {step < STEPS.length ? (
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
                className={cn(
                  "h-10 rounded-lg px-4 text-sm font-medium text-white",
                  canContinue
                    ? "bg-[var(--brand)] hover:opacity-90"
                    : "cursor-not-allowed bg-slate-300",
                )}
              >
                Continuar →
              </button>
            ) : (
              <Link
                href="/cadastros/funcionalidades"
                className="inline-flex h-10 items-center rounded-lg bg-[var(--brand)] px-4 text-sm font-medium text-white hover:opacity-90"
              >
                Ir para cadastro
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
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
