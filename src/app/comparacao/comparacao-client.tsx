"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExperienceBadge } from "@/components/badges/experience-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { GapCard } from "@/components/gaps/gap-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import type { ChannelComparison, FeatureMapRow, Gap } from "@/types";

type ChannelOption = { id: string; name: string };

type AdvancedComparison = {
  commonCount: number;
  onlyACount: number;
  onlyBCount: number;
  parityPercent: number;
  experienceDiffs: {
    featureId: string;
    featureName: string;
    statusA: FeatureMapRow["status"];
    statusB: FeatureMapRow["status"];
    experienceA: FeatureMapRow["experience"];
    experienceB: FeatureMapRow["experience"];
    differentStatus: boolean;
    differentExperience: boolean;
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

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
          Comparação de canais · Inteligência
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Comparar cobertura entre canais
        </h1>
        <p className="max-w-3xl text-sm text-[var(--muted-foreground)]">
          Identifique funcionalidades comuns, exclusivas, diferenças de
          experiência e gaps — útil para migração Atual × Futuro.
        </p>
      </section>

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
            label="Paridade"
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

          {advanced && advanced.experienceDiffs.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Diferenças de status/experiência</CardTitle>
                <CardDescription>
                  Funcionalidades comuns com qualidade ou status divergente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {advanced.experienceDiffs.map((diff) => (
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
                      <ExperienceBadge experience={diff.experienceA} />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {nameB}
                      </span>
                      <StatusBadge status={diff.statusB} />
                      <ExperienceBadge experience={diff.experienceB} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              Gaps relacionados
            </h2>
            {comparison.gaps.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nenhum gap associado a esses canais.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {comparison.gaps.map((gap: Gap) => (
                  <GapCard key={gap.id} gap={gap} />
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
                  <span className="ml-2 text-[10px] font-bold text-amber-700 uppercase">
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
