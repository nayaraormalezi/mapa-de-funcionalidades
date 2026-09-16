"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  archiveJourneyAudienceStage,
  upsertJourneyAudienceStage,
} from "@/app/actions/crud";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import {
  PageHeader,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { cn } from "@/lib/utils";
import type { JourneyAudienceStage } from "@/types";
import { Plus, Trash2 } from "lucide-react";

type Option = { value: string; label: string };

type StageDraft = {
  id: string;
  journeyId: string;
  displayName: string;
  sortOrder: number;
  momentId: string;
  isNew?: boolean;
};

export function EditarJornadasClient({
  audienceId,
  audienceName,
  moments,
  catalogJourneys,
  stages,
}: {
  audienceId: string;
  audienceName: string;
  moments: Option[];
  catalogJourneys: Option[];
  stages: JourneyAudienceStage[];
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
  const [drafts, setDrafts] = useState<StageDraft[]>(() =>
    stages
      .filter((s) => s.audienceId === audienceId && s.active)
      .map((s) => ({
        id: s.id,
        journeyId: s.journeyId,
        displayName: s.displayName,
        sortOrder: s.sortOrder,
        momentId: s.momentId,
      })),
  );

  const rows = useMemo(
    () =>
      drafts
        .filter((d) => d.momentId === momentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [drafts, momentId],
  );

  function updateRow(id: string, patch: Partial<StageDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }

  function addRow() {
    const nextOrder =
      rows.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
    const catalog = catalogJourneys[0];
    setDrafts((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID().slice(0, 8)}`,
        journeyId: catalog?.value ?? "",
        displayName: catalog?.label ?? "",
        sortOrder: nextOrder,
        momentId,
        isNew: true,
      },
    ]);
  }

  async function saveAll() {
    setMessage(null);
    startTransition(async () => {
      for (const row of rows) {
        if (!row.journeyId || !row.displayName.trim()) {
          setMessage("Preencha etapa do catálogo e nome exibido.");
          return;
        }
        const fd = new FormData();
        if (!row.isNew) fd.set("id", row.id);
        fd.set("audience_id", audienceId);
        fd.set("journey_id", row.journeyId);
        fd.set("display_name", row.displayName.trim());
        fd.set("sort_order", String(row.sortOrder));
        fd.set("moment_id", row.momentId);
        fd.set("active", "true");
        const result = await upsertJourneyAudienceStage(fd);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
      }
      setMessage("Jornada salva.");
      router.refresh();
    });
  }

  async function removeRow(row: StageDraft) {
    if (row.isNew) {
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
      return;
    }
    startTransition(async () => {
      const result = await archiveJourneyAudienceStage(row.id);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
      setMessage("Etapa removida.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Jornadas › Editar"
        title={`Jornada do ${audienceName}`}
        description="Customize as etapas desta jornada por momento. O catálogo de etapas é compartilhado; o nome e a ordem podem variar por público."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BackButton href="/jornadas" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/cadastros/jornadas">Catálogo global</Link>
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
            disabled={pending || catalogJourneys.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar etapa
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              Nenhuma etapa neste momento. Adicione etapas do catálogo.
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-xl border border-[var(--border)] bg-white p-3 md:grid-cols-[80px_1fr_1fr_auto]"
              >
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Ordem
                  <input
                    type="number"
                    value={row.sortOrder}
                    onChange={(e) =>
                      updateRow(row.id, {
                        sortOrder: Number(e.target.value) || 0,
                      })
                    }
                    className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Etapa do catálogo
                  <select
                    value={row.journeyId}
                    onChange={(e) => {
                      const journeyId = e.target.value;
                      const label =
                        catalogJourneys.find((j) => j.value === journeyId)
                          ?.label ?? "";
                      updateRow(row.id, {
                        journeyId,
                        displayName: row.displayName || label,
                      });
                    }}
                    className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-sm"
                  >
                    {catalogJourneys.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Nome exibido para {audienceName}
                  <input
                    value={row.displayName}
                    onChange={(e) =>
                      updateRow(row.id, { displayName: e.target.value })
                    }
                    placeholder="Ex.: Venda"
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
              message?.includes("salva") || message?.includes("removida")
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
