"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FilterSelect,
  PageHeader,
  ProgressBar,
  SectionTitle,
  StatCard,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StageBadge } from "@/components/badges/stage-badge";
import { featureStageLabel, FEATURE_STAGE_ORDER } from "@/lib/labels";
import { cn, formatPercent } from "@/lib/utils";
import type { AudienceCode, FeatureStage, Priority } from "@/types";
import {
  ArrowRight,
  Layers,
  Map,
  Package,
  Route,
  ShieldAlert,
} from "lucide-react";

type ProductFeature = {
  id: string;
  name: string;
  priority: Priority;
  phase: FeatureStage;
  productOwner: string;
  audienceCount: number;
  channelCount: number;
  openGaps: number;
};

type ProductAudience = {
  id: string;
  name: string;
  code?: AudienceCode;
  featureTotal: number;
  featureAvailable: number;
  coveragePercent: number;
};

type ProductChannel = {
  id: string;
  name: string;
  featureTotal: number;
  featureAvailable: number;
  coveragePercent: number;
};

export type ProductSummary = {
  id?: string;
  name: string;
  shortName?: string;
  description?: string;
  featureTotal: number;
  featureAvailable: number;
  featureInProgress: number;
  coveragePercent: number;
  audienceCount: number;
  channelCount: number;
  journeyCount: number;
  momentCount: number;
  openGaps: number;
  owners: string[];
  stageCounts: Record<string, number>;
  features: ProductFeature[];
  audiences: ProductAudience[];
  channels: ProductChannel[];
};

type Tab = "overview" | "features" | "coverage";

export function ProdutosClient({
  products,
  audiences,
  initialProduct,
}: {
  products: ProductSummary[];
  audiences: { id: string; name: string; code: AudienceCode }[];
  initialProduct?: string;
}) {
  const [audienceId, setAudienceId] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedName, setSelectedName] = useState(
    initialProduct && products.some((p) => p.name === initialProduct)
      ? initialProduct
      : (products[0]?.name ?? ""),
  );

  const filteredProducts = useMemo(() => {
    if (!audienceId) return products;
    return products
      .map((product) => {
        const audience = product.audiences.find((a) => a.id === audienceId);
        if (!audience) return null;
        return {
          ...product,
          featureTotal: audience.featureTotal,
          featureAvailable: audience.featureAvailable,
          coveragePercent: audience.coveragePercent,
        };
      })
      .filter((p): p is ProductSummary => p !== null);
  }, [products, audienceId]);

  const selected =
    filteredProducts.find((p) => p.name === selectedName) ??
    filteredProducts[0] ??
    null;

  const totalFeatures = filteredProducts.reduce(
    (sum, p) => sum + p.featureTotal,
    0,
  );
  const totalAvailable = filteredProducts.reduce(
    (sum, p) => sum + p.featureAvailable,
    0,
  );
  const avgCoverage =
    filteredProducts.length === 0
      ? 0
      : filteredProducts.reduce((sum, p) => sum + p.coveragePercent, 0) /
        filteredProducts.length;
  const totalGaps = filteredProducts.reduce((sum, p) => sum + p.openGaps, 0);

  const audienceName =
    audiences.find((a) => a.id === audienceId)?.name ?? "Todos os públicos";

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Ecossistema › Produtos"
        title="Produtos"
        description="O Consórcio CAIXA se organiza em três linhas: Imobiliário, Veículos Leves e Veículos Pesados. Acompanhe cobertura, canais e jornadas de cada uma."
        callout={{
          title: "Três linhas, uma experiência",
          body: "Compare cobertura e gaps entre Imobiliário, Veículos Leves e Veículos Pesados para priorizar evolução.",
          icon: Package,
        }}
      />

      <SurfaceCard className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Público"
            value={audienceId}
            onChange={(id) => {
              setAudienceId(id);
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
          label="Produtos"
          value={filteredProducts.length}
          hint={audienceName}
          icon={Layers}
        />
        <StatCard
          label="Funcionalidades"
          value={totalFeatures}
          hint={`${totalAvailable} disponíveis`}
          tone="info"
        />
        <StatCard
          label="Cobertura média"
          value={formatPercent(avgCoverage)}
          tone="success"
        />
        <StatCard
          label="Gaps abertos"
          value={totalGaps}
          tone={totalGaps > 0 ? "warning" : "default"}
          hint="Vinculados às funcionalidades"
          icon={ShieldAlert}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <SurfaceCard className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Funcionalidades</th>
                <th className="px-4 py-3">Cobertura</th>
                <th className="px-4 py-3">Públicos</th>
                <th className="px-4 py-3">Canais</th>
                <th className="px-4 py-3">Jornadas</th>
                <th className="px-4 py-3">Gaps</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    Nenhum produto encontrado para o filtro selecionado.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const active = selected?.name === product.name;
                  return (
                    <tr
                      key={product.name}
                      onClick={() => {
                        setSelectedName(product.name);
                        setTab("overview");
                      }}
                      className={cn(
                        "cursor-pointer border-t border-[var(--border)] transition-colors",
                        active ? "bg-[var(--brand-soft)]" : "hover:bg-slate-50",
                      )}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {product.shortName || product.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {product.description ||
                            (product.owners[0]
                              ? `${product.owners[0]}${
                                  product.owners.length > 1
                                    ? ` +${product.owners.length - 1}`
                                    : ""
                                }`
                              : "Sem product owner")}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {product.featureTotal}
                        <span className="text-[var(--muted-foreground)]">
                          {" "}
                          · {product.featureAvailable} disp.
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="space-y-1">
                          <p className="text-xs font-medium tabular-nums">
                            {formatPercent(product.coveragePercent)}
                          </p>
                          <ProgressBar
                            value={product.coveragePercent}
                            barClassName="bg-[var(--brand)]"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {product.audienceCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {product.channelCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {product.journeyCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {product.openGaps}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          {!selected ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Selecione um produto para ver o detalhe.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
                  Produto selecionado
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  {selected.name}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {selected.description ||
                    (selected.owners.length > 0
                      ? selected.owners.join(" · ")
                      : "Sem product owner cadastrado")}
                </p>
              </div>

              <UnderlineTabs
                value={tab}
                onChange={(id) => setTab(id as Tab)}
                options={[
                  { id: "overview", label: "Resumo" },
                  {
                    id: "features",
                    label: "Funcionalidades",
                    count: selected.features.length,
                  },
                  { id: "coverage", label: "Cobertura" },
                ]}
              />

              {tab === "overview" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat
                      label="Disponíveis"
                      value={selected.featureAvailable}
                    />
                    <MiniStat
                      label="Em evolução"
                      value={selected.featureInProgress}
                    />
                    <MiniStat label="Canais" value={selected.channelCount} />
                    <MiniStat label="Jornadas" value={selected.journeyCount} />
                  </div>

                  <div>
                    <SectionTitle>Etapas</SectionTitle>
                    <div className="mt-2 space-y-2">
                      {FEATURE_STAGE_ORDER.filter(
                        (stage) => (selected.stageCounts[stage] ?? 0) > 0,
                      ).map((stage) => (
                        <div
                          key={stage}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-slate-700">
                            {featureStageLabel[stage]}
                          </span>
                          <span className="font-medium tabular-nums text-slate-900">
                            {selected.stageCounts[stage]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/mapa`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
                    >
                      <Map className="h-3.5 w-3.5" />
                      Abrir no mapa de funcionalidades
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <Link
                      href="/jornadas"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
                    >
                      <Route className="h-3.5 w-3.5" />
                      Ver jornadas relacionadas
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ) : null}

              {tab === "features" ? (
                <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                  {selected.features.map((feature) => (
                    <Link
                      key={feature.id}
                      href={`/funcionalidades/${feature.id}`}
                      className="block rounded-lg border border-[var(--border)] px-3 py-2.5 transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {feature.name}
                        </p>
                        <StageBadge stage={feature.phase} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={feature.priority} />
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {feature.channelCount} canais · {feature.audienceCount}{" "}
                          públicos
                          {feature.openGaps > 0
                            ? ` · ${feature.openGaps} gaps`
                            : ""}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}

              {tab === "coverage" ? (
                <div className="space-y-4">
                  <div>
                    <SectionTitle>Por público</SectionTitle>
                    <div className="mt-2 space-y-3">
                      {selected.audiences.map((audience) => (
                        <div key={audience.id} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-slate-800">
                              {audience.name}
                            </span>
                            <span className="tabular-nums text-xs text-[var(--muted-foreground)]">
                              {formatPercent(audience.coveragePercent)} ·{" "}
                              {audience.featureAvailable}/
                              {audience.featureTotal}
                            </span>
                          </div>
                          <ProgressBar
                            value={audience.coveragePercent}
                            barClassName="bg-[var(--brand)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <SectionTitle>Por canal</SectionTitle>
                    <div className="mt-2 space-y-3">
                      {selected.channels.map((channel) => (
                        <div key={channel.id} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-slate-800">
                              {channel.name}
                            </span>
                            <span className="tabular-nums text-xs text-[var(--muted-foreground)]">
                              {formatPercent(channel.coveragePercent)} ·{" "}
                              {channel.featureAvailable}/{channel.featureTotal}
                            </span>
                          </div>
                          <ProgressBar
                            value={channel.coveragePercent}
                            barClassName="bg-[var(--brand)]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </div>
  );
}
