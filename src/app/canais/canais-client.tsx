"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EditChannelsAudienceModal } from "@/app/canais/edit-channels-audience-modal";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
  StatusDotBadge,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import { temporalStatusLabel } from "@/lib/labels";
import { cn, formatPercent } from "@/lib/utils";
import type { AudienceCode, TemporalStatus } from "@/types";
import { ArrowRight, MoreHorizontal, PenLine, Radio } from "lucide-react";

type ChannelContextRow = {
  id: string;
  channelId: string;
  channelName: string;
  channelType: string;
  channelDescription: string;
  audienceId: string;
  audienceName: string;
  momentId: string;
  momentName: string;
  temporalStatus: TemporalStatus;
  notes: string;
  coveragePercent: number;
  featureTotal: number;
  featureAvailable: number;
};

type Tab = "all" | "moment" | "current" | "future";

function channelStatusLabel(row: ChannelContextRow) {
  if (row.temporalStatus === "FUTURE") return "Em implantação";
  if (row.coveragePercent >= 85) return "Operação";
  if (row.coveragePercent >= 60) return "Em evolução";
  return "Operação";
}

export function CanaisClient({
  contexts,
  audiences,
}: {
  contexts: ChannelContextRow[];
  audiences: {
    id: string;
    name: string;
    code: AudienceCode;
    description?: string;
  }[];
}) {
  const defaultAudience =
    audiences.find((a) => a.code === "CLIENT" || /cliente/i.test(a.name))
      ?.id ??
    audiences[0]?.id ??
    "";

  const [audienceId, setAudienceId] = useState(defaultAudience);
  const [tab, setTab] = useState<Tab>("all");
  const [editModalOpen, setEditModalOpen] = useState(false);

  const audienceContexts = useMemo(
    () =>
      audienceId
        ? contexts.filter((c) => c.audienceId === audienceId)
        : contexts,
    [contexts, audienceId],
  );

  const filtered = useMemo(() => {
    if (tab === "current") {
      return audienceContexts.filter((c) => c.temporalStatus === "CURRENT");
    }
    if (tab === "future") {
      return audienceContexts.filter((c) => c.temporalStatus === "FUTURE");
    }
    return audienceContexts;
  }, [audienceContexts, tab]);

  const [selectedId, setSelectedId] = useState(filtered[0]?.id ?? "");

  const selected =
    filtered.find((c) => c.id === selectedId) ??
    filtered[0] ??
    audienceContexts.find((c) => c.id === selectedId) ??
    null;

  const uniqueChannels = useMemo(() => {
    const map = new Map<string, ChannelContextRow>();
    for (const c of audienceContexts) {
      if (!map.has(c.channelId)) map.set(c.channelId, c);
    }
    return Array.from(map.values());
  }, [audienceContexts]);

  const currentCount = uniqueChannels.filter(
    (c) => c.temporalStatus === "CURRENT",
  ).length;
  const futureCount = uniqueChannels.filter(
    (c) => c.temporalStatus === "FUTURE",
  ).length;
  const avgCoverage =
    audienceContexts.length === 0
      ? 0
      : audienceContexts.reduce((acc, c) => acc + c.coveragePercent, 0) /
        audienceContexts.length;
  const evolving = uniqueChannels.filter(
    (c) =>
      c.temporalStatus === "CURRENT" &&
      c.coveragePercent < 85 &&
      c.coveragePercent >= 60,
  ).length;
  const implanting = futureCount;

  const audienceName =
    audiences.find((a) => a.id === audienceId)?.name ?? "Todos";
  const showAudienceColumn = !audienceId;

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Canais › Visão geral"
        title="Canais"
        description="Conheça os canais atuais e futuros por público, sua cobertura de funcionalidade e os planos de evolução."
        actions={
          <Button
            size="sm"
            type="button"
            onClick={() => setEditModalOpen(true)}
          >
            <PenLine className="h-3.5 w-3.5" />
            Editar canais
          </Button>
        }
      />

      <EditChannelsAudienceModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        audiences={audiences}
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Público"
            value={audienceId}
            onChange={(id) => {
              setAudienceId(id);
              setSelectedId("");
            }}
            options={[
              { value: "", label: "Todos" },
              ...audiences.map((a) => ({ value: a.id, label: a.name })),
            ]}
            className="min-w-[160px]"
          />
        </div>
      </SurfaceCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Canais"
          value={uniqueChannels.length}
          hint={`${currentCount} atuais • ${futureCount} futuros · ${audienceName}`}
          icon={Radio}
        />
        <StatCard
          label="Cobertura média"
          value={formatPercent(avgCoverage)}
          tone="success"
        />
        <StatCard
          label="Em implantação"
          value={implanting}
          tone="accent"
          hint="Canais futuros"
        />
        <StatCard
          label="Em evolução"
          value={evolving}
          tone="info"
          hint="Canais atuais em melhoria"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <UnderlineTabs
          value={tab}
          onChange={(id) => setTab(id as Tab)}
          options={[
            { id: "all", label: "Todos os canais" },
            { id: "current", label: "Canais atuais" },
            { id: "future", label: "Canais futuros" },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <SurfaceCard className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
              <tr>
                <th className="px-4 py-3">Canal</th>
                {showAudienceColumn ? (
                  <th className="px-4 py-3">Público</th>
                ) : null}
                <th className="px-4 py-3">Momento</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Funcionalidades</th>
                <th className="px-4 py-3">Cobertura</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Próximos marcos</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const active = selected?.id === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={cn(
                      "cursor-pointer border-t border-[var(--border)] transition-colors",
                      active ? "bg-[var(--brand-soft)]" : "hover:bg-slate-50",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.temporalStatus === "FUTURE"
                        ? `✦ ${row.channelName}`
                        : row.channelName}
                    </td>
                    {showAudienceColumn ? (
                      <td className="px-4 py-3">{row.audienceName}</td>
                    ) : null}
                    <td className="px-4 py-3">{row.momentName}</td>
                    <td className="px-4 py-3">
                      <StatusDotBadge
                        label={
                          row.temporalStatus === "CURRENT"
                            ? "Atual"
                            : row.temporalStatus === "FUTURE"
                              ? "Futuro"
                              : temporalStatusLabel[row.temporalStatus]
                        }
                        color={
                          row.temporalStatus === "FUTURE"
                            ? "bg-[var(--accent)]"
                            : row.temporalStatus === "CURRENT"
                              ? "bg-[var(--success)]"
                              : "bg-slate-400"
                        }
                      />
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.featureTotal}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[110px] items-center gap-2">
                        <ProgressBar
                          value={row.coveragePercent}
                          className="h-1.5"
                          barClassName={
                            row.temporalStatus === "FUTURE"
                              ? "bg-[var(--accent)]"
                              : undefined
                          }
                        />
                        <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                          {formatPercent(row.coveragePercent)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {channelStatusLabel(row)}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-xs text-slate-500">
                      {row.notes || "Manutenção contínua"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-slate-100"
                        aria-label="Ações"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-[var(--muted-foreground)]">
              Nenhum canal para {audienceName} neste filtro. Use &quot;Editar
              canais&quot; para configurar.
            </p>
          ) : null}
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="p-4">
            <SectionTitle>Detalhes do canal</SectionTitle>
            {!selected ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Selecione um canal na tabela.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-semibold text-slate-900">
                    {selected.channelName}
                  </p>
                  <StatusDotBadge
                    label={
                      selected.temporalStatus === "CURRENT" ? "Atual" : "Futuro"
                    }
                    color={
                      selected.temporalStatus === "FUTURE"
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--success)]"
                    }
                  />
                </div>
                <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {selected.channelDescription ||
                    "Canal da experiência CAIXA Consórcio."}
                </p>
                <dl className="space-y-2">
                  <Row label="Público" value={selected.audienceName} />
                  <Row label="Momento" value={selected.momentName} />
                  <Row
                    label="Funcionalidades"
                    value={String(selected.featureTotal)}
                  />
                  <Row
                    label="Cobertura"
                    value={formatPercent(selected.coveragePercent)}
                  />
                  <Row label="Status" value={channelStatusLabel(selected)} />
                  <Row
                    label="Próximos marcos"
                    value={selected.notes || "Manutenção contínua"}
                  />
                </dl>
                <ProgressBar
                  value={selected.coveragePercent}
                  barClassName={
                    selected.temporalStatus === "FUTURE"
                      ? "bg-[var(--accent)]"
                      : undefined
                  }
                />
                <Link
                  href={
                    audienceId
                      ? `/canais/editar?publico=${audienceId}`
                      : selected
                        ? `/canais/editar?publico=${selected.audienceId}`
                        : "/canais"
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  Editar canais deste público{" "}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="p-4">
            <SectionTitle>Canais por situação</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-xl font-semibold">{uniqueChannels.length}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  canais no total
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-xl font-semibold">{currentCount}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Atuais
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-xl font-semibold">{futureCount}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Futuros
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-2 py-3">
                <p className="text-xl font-semibold">{evolving}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Em evolução
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="border-[var(--brand)]/20 bg-[var(--brand-soft)] p-4">
            <p className="text-sm font-semibold text-[#0f3d6e]">
              Evolução dos canais
            </p>
            <p className="mt-1 text-xs text-[#145fab]/90">
              Acompanhe a transição dos canais atuais para o futuro e entenda o
              impacto na experiência do usuário.
            </p>
            <Link
              href={
                audienceId
                  ? `/transformacao/${audienceId}`
                  : selected
                    ? `/transformacao/${selected.audienceId}`
                    : "/transformacao"
              }
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand)] hover:underline"
            >
              Ver visão de transformação →
            </Link>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] py-1.5">
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
