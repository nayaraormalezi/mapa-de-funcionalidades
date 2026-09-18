"use client";

import { useMemo, useState, useTransition } from "react";
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
import type { JourneyAudienceStage } from "@/types";
import { Plus, Trash2 } from "lucide-react";

type Option = { value: string; label: string };

type StageDraft = {
  id: string;
  /** Jornada canônica. */
  journeyId: string;
  /** Etapa do catálogo (JourneyStage). */
  journeyStageId: string;
  displayName: string;
  sortOrder: number;
  momentId: string;
  isNew?: boolean;
};

export function EditarJornadasClient({
  audienceId,
  audienceName,
  moments,
  catalogJourneyId,
  catalogStages,
  stages,
}: {
  audienceId: string;
  audienceName: string;
  moments: Option[];
  catalogJourneyId: string;
  catalogStages: Option[];
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
        journeyId: s.journeyId || catalogJourneyId,
        journeyStageId: s.journeyStageId ?? "",
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
    const stage = catalogStages[0];
    setDrafts((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID().slice(0, 8)}`,
        journeyId: catalogJourneyId,
        journeyStageId: stage?.value ?? "",
        displayName: stage?.label ?? "",
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
        if (!row.journeyStageId || !row.displayName.trim()) {
          setMessage("Preencha a etapa do catálogo e o nome exibido.");
          return;
        }
        const fd = new FormData();
        if (!row.isNew) fd.set("id", row.id);
        fd.set("audience_id", audienceId);
        fd.set("journey_id", row.journeyId || catalogJourneyId);
        fd.set("journey_stage_id", row.journeyStageId);
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
        breadcrumb={[
          { label: "Jornadas", href: "/jornadas" },
          { label: "Editar" },
        ]}
        title={`Jornada · ${audienceName}`}
        description="Customize rótulo, ordem e momento das etapas canônicas por público. A estrutura da jornada é compartilhada."
        leading={<BackButton href="/jornadas" />}
      />

      <SurfaceCard className="p-4">
        <UnderlineTabs
          value={momentId}
          onChange={setMomentId}
          options={moments.map((m) => ({ id: m.value, label: m.label }))}
          className="border-b-0"
        />

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
                  Etapa (catálogo)
                  <select
                    value={row.journeyStageId}
                    onChange={(e) => {
                      const journeyStageId = e.target.value;
                      const label =
                        catalogStages.find((j) => j.value === journeyStageId)
                          ?.label ?? "";
                      updateRow(row.id, {
                        journeyStageId,
                        displayName: label || row.displayName,
                        journeyId: catalogJourneyId,
                      });
                    }}
                    className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                  >
                    <option value="">Selecione</option>
                    {catalogStages.map((j) => (
                      <option key={j.value} value={j.value}>
                        {j.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Nome exibido
                  <input
                    value={row.displayName}
                    onChange={(e) =>
                      updateRow(row.id, { displayName: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-[var(--border)] px-2 text-sm"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600"
                    onClick={() => removeRow(row)}
                    disabled={pending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={pending || catalogStages.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar etapa
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={saveAll}
            disabled={pending || rows.length === 0}
          >
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          {message ? (
            <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
