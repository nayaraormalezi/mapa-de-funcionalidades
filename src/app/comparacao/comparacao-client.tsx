"use client";

/**
 * UI de Comparison (Canal × Canal).
 * Consumida por `/inteligencia/comparacoes`.
 * Pasta `/comparacao` mantida por compatibilidade de import — não é módulo de 1º nível.
 */
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { HealthBadge } from "@/components/badges/health-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { IssueCard } from "@/components/gaps/gap-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CONCEPT_LABEL } from "@/lib/labels";
import { formatPercent } from "@/lib/utils";
import type { ChannelComparison, FeatureMapRow, Issue } from "@/types";
import {
  InsightsFoundSection,
  type InsightCardProps,
} from "@/components/intelligence/insight-card";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";
import { PageHeader } from "@/components/ui/prototype";

type ChannelOption = { id: string; name: string };

type HealthDiff = {
  featureId: string;
  featureName: string;
  statusA: FeatureMapRow["status"];
  statusB: FeatureMapRow["status"];
  healthScoreA: number | null;
  healthScoreB: number | null;
  healthSignalA: FeatureMapRow["healthSignal"];
  healthSignalB: FeatureMapRow["healthSignal"];
  differentStatus: boolean;
  differentHealth: boolean;
};

type AdvancedComparison = {
  commonCount: number;
  onlyACount: number;
  onlyBCount: number;
  parityPercent: number;
  healthDiffs?: HealthDiff[];
  /** @deprecated Prefer healthDiffs */
  experienceDiffs?: {
    featureId: string;
    featureName: string;
    statusA: FeatureMapRow["status"];
    statusB: FeatureMapRow["status"];
    differentStatus: boolean;
  }[];
  common: FeatureMapRow[];
  onlyA: FeatureMapRow[];
  onlyB: FeatureMapRow[];
};

export function ComparacaoClient({
  channels,
  initialChannelA,
  initialChannelB,
  initialComparison,
  initialAdvanced,
}: {
  channels: ChannelOption[];
  initialChannelA: string;
  initialChannelB: string;
  initialComparison: ChannelComparison | null;
  initialAdvanced: AdvancedComparison | null;
}) {
  const [channelA, setChannelA] = useState(initialChannelA);
  const [channelB, setChannelB] = useState(initialChannelB);
  const [comparison, setComparison] = useState(initialComparison);
  const [advanced, setAdvanced] = useState(initialAdvanced);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (channelA === initialChannelA && channelB === initialChannelB) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/compare?a=${encodeURIComponent(channelA)}&b=${encodeURIComponent(channelB)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setComparison(data.comparison);
        setAdvanced(data.advanced);
      }
    });
  }, [channelA, channelB, initialChannelA, initialChannelB]);

  const nameA = channels.find((c) => c.id === channelA)?.name ?? "Canal A";
  const nameB = channels.find((c) => c.id === channelB)?.name ?? "Canal B";
  const healthDiffs = advanced?.healthDiffs ?? [];

  const comparisonInsights: InsightCardProps[] = [];
  if (advanced) {
    if (advanced.onlyACount > 0) {
      comparisonInsights.push({
        title: `${advanced.onlyACount} funcionalidade(s) só em ${nameA}`,
        description: `Presentes em ${nameA} e ausentes em ${nameB}.`,
        severity: "watch",
        origin: "COMPARISON",
        context: `${nameA} × ${nameB}`,
        href: advanced.onlyA[0]
          ? `/funcionalidades/${advanced.onlyA[0].featureId}`
          : undefined,
        actionLabel: "Abrir funcionalidades",
        metric: String(advanced.onlyACount),
      });
    }
    if (advanced.onlyBCount > 0) {
      comparisonInsights.push({
        title: `${advanced.onlyBCount} funcionalidade(s) só em ${nameB}`,
        description: `Presentes em ${nameB} e ausentes em ${nameA}.`,
        severity: "watch",
        origin: "COMPARISON",
        context: `${nameA} × ${nameB}`,
        metric: String(advanced.onlyBCount),
      });
    }
  }
  const statusDiffs = healthDiffs.filter((d) => d.differentStatus);
  if (statusDiffs.length > 0) {
    comparisonInsights.push({
      title: `${statusDiffs.length} funcionalidade(s) com status diferentes entre os canais`,
      description: `Há divergência de prazo/status entre ${nameA} e ${nameB}.`,
      severity: "warning",
      origin: "COMPARISON",
      context: `${nameA} × ${nameB}`,
      href: `/funcionalidades/${statusDiffs[0]!.featureId}`,
      actionLabel: "Investigar",
      metric: String(statusDiffs.length),
    });
  }
  const healthScoreDiffs = healthDiffs.filter((d) => d.differentHealth);
  if (healthScoreDiffs.length > 0) {
    comparisonInsights.push({
      title: `${healthScoreDiffs.length} funcionalidade(s) com Health divergente`,
      description: "A mesma funcionalidade apresenta sinais de experiência diferentes entre os canais.",
      severity: "warning",
      origin: "COMPARISON",
      context: `${nameA} × ${nameB}`,
      href: `/funcionalidades/${healthScoreDiffs[0]!.featureId}`,
      actionLabel: "Investigar",
      metric: String(healthScoreDiffs.length),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Inteligência", href: "/inteligencia" },
          { label: "Comparações" },
        ]}
        title="Comparar cobertura entre canais"
        description={`Análise Canal × Canal sobre Implementations existentes. Health vem das Evaluations; ${CONCEPT_LABEL.issues.toLowerCase()} vêm do catálogo persistido — sem fórmulas paralelas.`}
      />

      <IntelligenceNav />

      <Card>
        <CardHeader>
          <CardTitle>Selecionar canais</CardTitle>
          <CardDescription>
            Exemplo típico: App CAIXA Consórcio × SuperApp CAIXA
            {pending ? " · atualizando…" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Canal A
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={channelA}
              onChange={(e) => setChannelA(e.target.value)}
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Canal B
            </span>
            <select
              className="flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={channelB}
              onChange={(e) => setChannelB(e.target.value)}
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {advanced ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Paridade de cobertura"
            value={formatPercent(advanced.parityPercent)}
          />
          <MetricCard label="Comuns" value={String(advanced.commonCount)} />
          <MetricCard
            label={`Só em ${nameA}`}
            value={String(advanced.onlyACount)}
          />
          <MetricCard
            label={`Só em ${nameB}`}
            value={String(advanced.onlyBCount)}
          />
        </div>
      ) : null}

      {advanced || comparison ? (
        <InsightsFoundSection insights={comparisonInsights} />
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          Nenhuma comparação realizada. Selecione dois canais para identificar
          diferenças.
        </p>
      )}

      {comparison ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <FeatureListCard
              title="Comuns"
              description={`Presentes em ${nameA} e ${nameB}`}
              features={comparison.common}
            />
            <FeatureListCard
              title={`Somente em ${nameA}`}
              description="Cobertura exclusiva do canal A"
              features={comparison.onlyA}
            />
            <FeatureListCard
              title={`Somente em ${nameB}`}
              description="Cobertura exclusiva do canal B"
              features={comparison.onlyB}
            />
          </div>

          {healthDiffs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Diferenças de status / Health</CardTitle>
                <CardDescription>
                  Funcionalidades comuns com Health canônico (Evaluation) ou
                  status de prazo divergente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {healthDiffs.map((diff) => (
                  <div
                    key={diff.featureId}
                    className="grid gap-2 rounded-lg border border-[var(--border)] px-3 py-3 md:grid-cols-[1.2fr_1fr_1fr]"
                  >
                    <Link
                      href={`/funcionalidades/${diff.featureId}`}
                      className="text-sm font-medium text-[var(--brand)] hover:underline"
                    >
                      {diff.featureName}
                    </Link>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {nameA}
                      </span>
                      <StatusBadge status={diff.statusA} />
                      <HealthBadge
                        score={diff.healthScoreA}
                        signal={diff.healthSignalA}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {nameB}
                      </span>
                      <StatusBadge status={diff.statusB} />
                      <HealthBadge
                        score={diff.healthScoreB}
                        signal={diff.healthSignalB}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {CONCEPT_LABEL.issues} relacionadas
            </h2>
            {comparison.issues.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhuma {CONCEPT_LABEL.issue.toLowerCase()} associada a esses
                canais.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {comparison.issues.map((issue: Issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function FeatureListCard({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: { id: string; name: string; isDemo: boolean }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {features.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma funcionalidade neste conjunto.
          </p>
        ) : (
          <ul className="space-y-2">
            {features.map((feature) => (
              <li key={feature.id}>
                <Link
                  href={`/funcionalidades/${feature.id}`}
                  className="text-sm font-medium text-[var(--brand)] hover:underline"
                >
                  {feature.name}
                </Link>
                {feature.isDemo ? (
                  <span className="ml-2 text-[10px] font-semibold text-amber-700 uppercase">
                    DEMO
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
