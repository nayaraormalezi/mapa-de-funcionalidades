"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveRecord,
  upsertChannelContext,
} from "@/app/actions/crud";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  PageHeader,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { cn } from "@/lib/utils";
import type { ChannelContext, TemporalStatus } from "@/types";
import { ArrowRight, Check } from "lucide-react";

type Option = { value: string; label: string };

type ContextDraft = {
  id: string;
  channelId: string;
  momentId: string;
  temporalStatus: TemporalStatus;
  notes: string;
  isNew?: boolean;
};

function ChannelPillPicker({
  label,
  hint,
  tone,
  options,
  selectedIds,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  tone: "current" | "future";
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            tone === "future" ? "text-[var(--brand)]" : "text-slate-500",
          )}
        >
          {label}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selectedIds.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-50",
                active
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                  : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600",
              )}
            >
              {active ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              {opt.label}
            </button>
          );
        })}
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-amber-700">
          Nenhum canal no catálogo. Cadastre canais primeiro.
        </p>
      ) : null}
    </div>
  );
}

export function EditarCanaisClient({
  audienceId,
  audienceName,
  moments,
  catalogChannels,
  contexts,
}: {
  audienceId: string;
  audienceName: string;
  moments: Option[];
  catalogChannels: Option[];
  contexts: ChannelContext[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaultMoment =
    moments.find(
      (m) => /venda/i.test(m.label) && !/p[oó]s/i.test(m.label),
    )?.value ??
    moments[0]?.value ??
    "";
  const [momentId, setMomentId] = useState(defaultMoment);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ContextDraft[]>(() =>
    contexts
      .filter((c) => c.audienceId === audienceId && c.active)
      .map((c) => ({
        id: c.id,
        channelId: c.channelId,
        momentId: c.momentId,
        temporalStatus: c.temporalStatus,
        notes: c.notes,
      })),
  );

  useEffect(() => {
    setDrafts(
      contexts
        .filter((c) => c.audienceId === audienceId && c.active)
        .map((c) => ({
          id: c.id,
          channelId: c.channelId,
          momentId: c.momentId,
          temporalStatus: c.temporalStatus,
          notes: c.notes,
        })),
    );
  }, [contexts, audienceId]);

  const momentRows = useMemo(
    () => drafts.filter((d) => d.momentId === momentId),
    [drafts, momentId],
  );

  const currentIds = useMemo(
    () =>
      momentRows
        .filter((d) => d.temporalStatus === "CURRENT")
        .map((d) => d.channelId),
    [momentRows],
  );

  const futureIds = useMemo(
    () =>
      momentRows
        .filter((d) => d.temporalStatus === "FUTURE")
        .map((d) => d.channelId),
    [momentRows],
  );

  function setSelection(status: TemporalStatus, channelIds: string[]) {
    setDrafts((prev) => {
      const kept = prev.filter(
        (d) => !(d.momentId === momentId && d.temporalStatus === status),
      );
      const existingByChannel = new Map(
        prev
          .filter((d) => d.momentId === momentId && d.temporalStatus === status)
          .map((d) => [d.channelId, d]),
      );
      const nextRows: ContextDraft[] = channelIds.map((channelId) => {
        const existing = existingByChannel.get(channelId);
        if (existing) return existing;
        return {
          id: `new-${crypto.randomUUID().slice(0, 8)}`,
          channelId,
          momentId,
          temporalStatus: status,
          notes: "",
          isNew: true,
        };
      });
      return [...kept, ...nextRows];
    });
  }

  async function saveAll() {
    setMessage(null);
    startTransition(async () => {
      const originalIds = new Set(
        contexts
          .filter((c) => c.audienceId === audienceId && c.active)
          .map((c) => c.id),
      );
      const draftIds = new Set(
        drafts.filter((d) => !d.isNew).map((d) => d.id),
      );

      for (const id of originalIds) {
        if (draftIds.has(id)) continue;
        const result = await archiveRecord("channel_contexts", id);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
      }

      for (const row of drafts) {
        if (!row.channelId) continue;
        const fd = new FormData();
        if (!row.isNew) fd.set("id", row.id);
        fd.set("audience_id", audienceId);
        fd.set("moment_id", row.momentId);
        fd.set("channel_id", row.channelId);
        fd.set("temporal_status", row.temporalStatus);
        fd.set("notes", row.notes);
        fd.set("active", "true");
        const result = await upsertChannelContext(fd);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
      }

      setMessage("Transformação de canais salva.");
      router.refresh();
    });
  }

  const currentNames = currentIds
    .map((id) => catalogChannels.find((c) => c.value === id)?.label ?? id)
    .filter(Boolean);
  const futureNames = futureIds
    .map((id) => catalogChannels.find((c) => c.value === id)?.label ?? id)
    .filter(Boolean);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[
          { label: "Canais", href: "/canais" },
          { label: "Editar" },
        ]}
        title={`Transformação — ${audienceName}`}
        description="Selecione quais canais existem hoje e quais entram em breve, por momento da jornada."
        leading={<BackButton href="/canais#transformacao" />}
      />

      <SurfaceCard className="p-4">
        <UnderlineTabs
          value={momentId}
          onChange={setMomentId}
          options={moments.map((m) => ({ id: m.value, label: m.label }))}
          className="border-b-0"
        />

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <ChannelPillPicker
            label="Hoje (canais atuais)"
            hint="Canais em operação neste momento."
            tone="current"
            options={catalogChannels}
            selectedIds={currentIds}
            onChange={(ids) => setSelection("CURRENT", ids)}
            disabled={pending}
          />
          <div className="hidden justify-center pt-8 lg:flex">
            <ArrowRight className="h-5 w-5 text-[var(--brand)]" />
          </div>
          <ChannelPillPicker
            label="Em breve (canais futuros)"
            hint="Canais em implantação ou planejados."
            tone="future"
            options={catalogChannels}
            selectedIds={futureIds}
            onChange={(ids) => setSelection("FUTURE", ids)}
            disabled={pending}
          />
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-slate-50/80 px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400">
            Prévia deste momento
          </p>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <PreviewPills names={currentNames} tone="current" />
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)]" />
            <PreviewPills names={futureNames} tone="future" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p
            className={cn(
              "text-xs",
              message?.includes("salva")
                ? "text-emerald-700"
                : "text-slate-500",
            )}
          >
            {message ??
              "As alterações de todos os momentos são salvas juntas."}
          </p>
          <Button type="button" size="sm" onClick={saveAll} disabled={pending}>
            {pending ? "Salvando…" : "Salvar transformação"}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}

function PreviewPills({
  names,
  tone,
}: {
  names: string[];
  tone: "current" | "future";
}) {
  if (names.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium",
            tone === "current"
              ? "bg-[#f3f4f6] text-slate-700"
              : "bg-[#e6f0f7] text-[#005ca9]",
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
