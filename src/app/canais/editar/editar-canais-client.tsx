"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  archiveRecord,
  upsertChannelContext,
} from "@/app/actions/crud";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { temporalStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { ChannelContext, TemporalStatus } from "@/types";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Option = { value: string; label: string };

type ContextDraft = {
  id: string;
  channelId: string;
  momentId: string;
  temporalStatus: TemporalStatus;
  notes: string;
  isNew?: boolean;
};

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

  const rows = useMemo(
    () => drafts.filter((d) => d.momentId === momentId),
    [drafts, momentId],
  );

  function updateRow(id: string, patch: Partial<ContextDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }

  function addRow() {
    const channel = catalogChannels[0];
    setDrafts((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID().slice(0, 8)}`,
        channelId: channel?.value ?? "",
        momentId,
        temporalStatus: "CURRENT",
        notes: "",
        isNew: true,
      },
    ]);
  }

  async function saveAll() {
    setMessage(null);
    startTransition(async () => {
      for (const row of rows) {
        if (!row.channelId) {
          setMessage("Selecione o canal em todas as linhas.");
          return;
        }
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
      setMessage("Canais salvos.");
      router.refresh();
    });
  }

  async function removeRow(row: ContextDraft) {
    if (row.isNew) {
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
      return;
    }
    startTransition(async () => {
      const result = await archiveRecord("channel_contexts", row.id);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
      setMessage("Canal removido deste público.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Canais › Editar"
        title={`Canais do ${audienceName}`}
        description="Defina quais canais entram na jornada deste público em cada momento. O catálogo de canais é compartilhado; a ativação é por público."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/canais">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cadastros/canais">Catálogo de canais</Link>
            </Button>
          </div>
        }
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <UnderlineTabs
            value={momentId}
            onChange={setMomentId}
            options={moments.map((m) => ({ id: m.value, label: m.label }))}
            className="border-b-0"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addRow}
            disabled={pending || catalogChannels.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar canal
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhum canal neste momento. Adicione canais do catálogo.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-xl border border-[var(--border)] bg-white p-3 md:grid-cols-[1fr_160px_1fr_auto]"
              >
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Canal
                  <select
                    value={row.channelId}
                    onChange={(e) =>
                      updateRow(row.id, { channelId: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                  >
                    {catalogChannels.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Situação
                  <select
                    value={row.temporalStatus}
                    onChange={(e) =>
                      updateRow(row.id, {
                        temporalStatus: e.target.value as TemporalStatus,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                  >
                    {Object.entries(temporalStatusLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Notas
                  <input
                    value={row.notes}
                    onChange={(e) =>
                      updateRow(row.id, { notes: e.target.value })
                    }
                    placeholder="Ex.: Em implantação"
                    className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(row)}
                    disabled={pending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p
            className={cn(
              "text-xs",
              message?.includes("salvo") || message?.includes("removido")
                ? "text-emerald-700"
                : "text-slate-500",
            )}
          >
            {message ??
              "As alterações deste momento são salvas ao clicar em Salvar."}
          </p>
          <Button type="button" size="sm" onClick={saveAll} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
