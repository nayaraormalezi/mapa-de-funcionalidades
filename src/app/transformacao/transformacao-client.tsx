"use client";

/**
 * UI de Transformation (CURRENT × FUTURE).
 * Consumida por `/inteligencia/transformacoes`.
 * Pasta `/transformacao` mantida por compatibilidade — análise, não Evolution.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StageBadge } from "@/components/badges/stage-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { ChannelMigrationView } from "@/components/transformation/channel-migration-view";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import {
  FilterSelect,
  PageHeader,
  SurfaceCard,
} from "@/components/ui/prototype";
import { formatPercent } from "@/lib/utils";
import type { AudienceCode, TransformationSummary } from "@/types";
import { ArrowDown } from "lucide-react";
import {
  InsightsFoundSection,
  type InsightCardProps,
} from "@/components/intelligence/insight-card";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";

type MigrationRow = {
  current: {
    featureChannelContextId: string;
    featureId: string;
    featureName: string;
    channelName: string;
    audienceName: string;
    momentName: string;
    audienceId: string;
    momentId: string;
    channelId: string;
    status: import("@/types").FeatureStatus;
    phase: import("@/types").FeatureStage;
  };
  future: {
    featureChannelContextId: string;
    channelName: string;
    status: import("@/types").FeatureStatus;
    phase: import("@/types").FeatureStage;
    channelId: string;
  } | null;
};

export function TransformacaoClient({
  audienceId,
  audienceName,
  summaries,
  migrations,
  moments,
  audiences,
  basePath = "/inteligencia/transformacoes",
}: {
  audienceId: string;
  audienceName: string;
  summaries: TransformationSummary[];
  migrations: MigrationRow[];
  moments: { id: string; name: string }[];
  audiences: { id: string; name: string; code: AudienceCode }[];
  basePath?: string;
}) {
  const router = useRouter();
  const [momentId, setMomentId] = useState("");
  const [onlyUndefined, setOnlyUndefined] = useState(false);

  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (s.audienceId !== audienceId) return false;
      if (momentId && s.momentId !== momentId) return false;
      if (onlyUndefined && s.undefined.length === 0) return false;
      return true;
    });
  }, [summaries, audienceId, momentId, onlyUndefined]);

  const filteredMigrations = useMemo(() => {
    return migrations.filter(({ current, future }) => {
      if (current.audienceId !== audienceId) return false;
      if (momentId && current.momentId !== momentId) return false;
      if (!onlyUndefined) return true;
      if (future === null) return true;
      return future.phase === "REMOVED";
    });
  }, [migrations, audienceId, momentId, onlyUndefined]);

  const readinessPercent = useMemo(() => {
    const scoped = summaries.filter((s) => s.audienceId === audienceId);
    const migrate = scoped.reduce((a, s) => a + s.migrate.length, 0);
    const create = scoped.reduce((a, s) => a + s.create.length, 0);
    const undefinedCount = scoped.reduce((a, s) => a + s.undefined.length, 0);
    const denominator = migrate + undefinedCount + create || 1;
    return ((migrate + create) / denominator) * 100;
  }, [summaries, audienceId]);

  const transformInsights: InsightCardProps[] = useMemo(() => {
    const scoped = summaries.filter((s) => s.audienceId === audienceId);
    const undefinedCount = scoped.reduce((a, s) => a + s.undefined.length, 0);
    const migrate = scoped.reduce((a, s) => a + s.migrate.length, 0);
    const create = scoped.reduce((a, s) => a + s.create.length, 0);
    const discontinue = scoped.reduce((a, s) => a + s.discontinue.length, 0);
    const list: InsightCardProps[] = [];
    if (undefinedCount > 0) {
      list.push({
        title: `${undefinedCount} funcionalidade(s) ainda não possuem destino futuro`,
        description:
          "Há implementações no canal atual sem definição no canal futuro.",
        severity: "warning",
        origin: "TRANSFORMATION",
        context: audienceName,
        actionLabel: "Investigar",
        metric: String(undefinedCount),
      });
    }
    if (migrate > 0) {
      list.push({
        title: `${migrate} funcionalidade(s) a migrar`,
        description: "Itens com caminho Atual → Futuro identificado.",
        severity: "info",
        origin: "TRANSFORMATION",
        context: audienceName,
        metric: String(migrate),
      });
    }
    if (create > 0) {
      list.push({
        title: `${create} funcionalidade(s) a criar no futuro`,
        description: "Cobertura futura sem correspondente no canal atual.",
        severity: "watch",
        origin: "TRANSFORMATION",
        context: audienceName,
        metric: String(create),
      });
    }
    if (discontinue > 0) {
      list.push({
        title: `${discontinue} funcionalidade(s) a descontinuar`,
        description: "Presentes no atual e marcadas para remoção no futuro.",
        severity: "watch",
        origin: "TRANSFORMATION",
        context: audienceName,
        metric: String(discontinue),
      });
    }
    return list;
  }, [summaries, audienceId, audienceName]);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[
          { label: "Inteligência", href: "/inteligencia" },
          { label: "Transformações", href: basePath },
          { label: audienceName },
        ]}
        title={`Atual → Futuro · ${audienceName}`}
        description={`Análise de Implementations (CURRENT × FUTURE) para ${audienceName}. Prontidão: ${formatPercent(readinessPercent)}.`}
        leading={
          <div className="flex flex-wrap items-center gap-2">
            <BackButton href={basePath} />
            <Button asChild variant="ghost" size="sm">
              <Link href={basePath}>Trocar público</Link>
            </Button>
          </div>
        }
      />

      <IntelligenceNav />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Público"
            value={audienceId}
            onChange={(id) => {
              router.push(`${basePath}/${id}`);
            }}
            options={audiences.map((a) => ({ value: a.id, label: a.name }))}
            className="min-w-[160px]"
          />
          <FilterSelect
            label="Momento"
            value={momentId}
            onChange={setMomentId}
            options={[
              { value: "", label: "Todos" },
              ...moments.map((m) => ({ value: m.id, label: m.name })),
            ]}
            className="min-w-[160px]"
          />
          <label className="mb-0.5 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyUndefined}
              onChange={(e) => setOnlyUndefined(e.target.checked)}
              className="rounded border-slate-300"
            />
            Apenas sem definição no futuro
          </label>
        </div>
      </SurfaceCard>

      <InsightsFoundSection insights={transformInsights} />

      <div className="space-y-5">
        {filteredSummaries.map((summary) => (
          <ChannelMigrationView
            key={`${summary.audienceId}-${summary.momentId}`}
            summary={summary}
            audienceScoped
          />
        ))}
        {filteredSummaries.length === 0 ? (
          <SurfaceCard className="p-6">
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma transformação cadastrada para {audienceName} com os
              filtros atuais.
            </p>
          </SurfaceCard>
        ) : null}
      </div>

      <SurfaceCard className="p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Plano de migração · {audienceName}
        </h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Canal atual → Funcionalidade → Canal futuro → Status
        </p>
        <div className="mt-4 space-y-3">
          {filteredMigrations.map(({ current, future }) => (
            <div
              key={`${current.featureChannelContextId}-${future?.featureChannelContextId ?? "none"}`}
              className="grid gap-3 rounded-xl border border-[var(--border)] bg-slate-50/80 p-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto]"
            >
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Canal atual
                </p>
                <p className="mt-1 text-sm font-medium">{current.channelName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {current.momentName}
                </p>
              </div>
              <ArrowDown className="hidden h-4 w-4 self-center text-[var(--muted-foreground)] md:block md:rotate-[-90deg]" />
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Funcionalidade
                </p>
                <Link
                  href={`/funcionalidades/${current.featureId}`}
                  className="mt-1 inline-block text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  {current.featureName}
                </Link>
              </div>
              <ArrowDown className="hidden h-4 w-4 self-center text-[var(--muted-foreground)] md:block md:rotate-[-90deg]" />
              <div>
                <p className="text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Canal futuro
                </p>
                <p className="mt-1 text-sm font-medium">
                  {future?.channelName ?? "Sem definição"}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 self-center">
                {future ? (
                  <>
                    <StageBadge stage={future.phase} />
                    <StatusBadge status={future.status} />
                  </>
                ) : (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Indefinido
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredMigrations.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma migração para {audienceName} com os filtros selecionados.
            </p>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
