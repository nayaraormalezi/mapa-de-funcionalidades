import { ProdutosClient } from "@/app/produtos/produtos-client";
import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";
import { DEVELOPMENT_STAGES, normalizeFeatureStage } from "@/lib/labels";
import {
  isProductId,
  PRODUCT_CATALOG,
  type ProductId,
} from "@/lib/products";
import type { FeatureStage, Priority } from "@/types";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: initialProduct } = await searchParams;
  const [db, rows] = await Promise.all([getDatabase(), buildFeatureMapRows()]);

  const gapsByFeature = new Map<string, number>();
  for (const gap of db.gaps) {
    if (!gap.featureId) continue;
    const record = gap as typeof gap & { active?: boolean };
    if (record.active === false) continue;
    if (gap.status !== "OPEN" && gap.status !== "IN_PROGRESS") continue;
    gapsByFeature.set(
      gap.featureId,
      (gapsByFeature.get(gap.featureId) ?? 0) + 1,
    );
  }

  // Evoluções ativas indexadas por productId via FCC.
  const fccProductById = new Map(
    db.featureChannelContexts.map((fcc) => [fcc.id, fcc.productId]),
  );
  const evolutionCountByProduct = new Map<ProductId, number>();
  for (const evo of db.featureEvolutions) {
    if (!evo.active) continue;
    if (evo.phase === "DONE") continue;
    if (evo.status === "DONE" || evo.status === "CANCELLED") continue;
    if (evo.status !== "IN_PROGRESS" && evo.status !== "PAUSED") continue;
    const productId = fccProductById.get(evo.featureChannelContextId);
    if (!productId || !isProductId(productId)) continue;
    evolutionCountByProduct.set(
      productId,
      (evolutionCountByProduct.get(productId) ?? 0) + 1,
    );
  }

  type Acc = {
    id: ProductId;
    name: string;
    featureIds: Set<string>;
    userNeedIds: Set<string>;
    implementationTotal: number;
    implementationAvailable: number;
    inProgressIds: Set<string>;
    audienceIds: Set<string>;
    channelIds: Set<string>;
    journeyIds: Set<string>;
    momentIds: Set<string>;
    owners: Set<string>;
    stageCounts: Record<string, number>;
    features: Map<
      string,
      {
        id: string;
        name: string;
        priority: Priority;
        phase: FeatureStage;
        productOwner: string;
        audiences: Set<string>;
        channels: Set<string>;
      }
    >;
  };

  const byProduct = new Map<ProductId, Acc>();

  for (const catalog of PRODUCT_CATALOG) {
    byProduct.set(catalog.id, {
      id: catalog.id,
      name: catalog.name,
      featureIds: new Set(),
      userNeedIds: new Set(),
      implementationTotal: 0,
      implementationAvailable: 0,
      inProgressIds: new Set(),
      audienceIds: new Set(),
      channelIds: new Set(),
      journeyIds: new Set(),
      momentIds: new Set(),
      owners: new Set(),
      stageCounts: {},
      features: new Map(),
    });
  }

  for (const row of rows) {
    if (!isProductId(row.productId)) continue;
    const acc = byProduct.get(row.productId);
    if (!acc) continue;

    acc.featureIds.add(row.featureId);
    if (row.userNeedId) acc.userNeedIds.add(row.userNeedId);
    acc.audienceIds.add(row.audienceId);
    acc.channelIds.add(row.channelId);
    acc.journeyIds.add(row.journeyId);
    acc.momentIds.add(row.momentId);
    if (row.productOwner) acc.owners.add(row.productOwner);

    acc.implementationTotal += 1;
    const phase = normalizeFeatureStage(row.phase);
    if (phase === "AVAILABLE") acc.implementationAvailable += 1;
    if (DEVELOPMENT_STAGES.includes(phase)) acc.inProgressIds.add(row.featureId);

    acc.stageCounts[phase] = (acc.stageCounts[phase] ?? 0) + 1;

    let feature = acc.features.get(row.featureId);
    if (!feature) {
      feature = {
        id: row.featureId,
        name: row.featureName,
        priority: row.priority,
        phase,
        productOwner: row.productOwner,
        audiences: new Set(),
        channels: new Set(),
      };
      acc.features.set(row.featureId, feature);
    }
    feature.audiences.add(row.audienceName);
    feature.channels.add(row.channelName);
  }

  const products = PRODUCT_CATALOG.map((catalog) => {
    const acc = byProduct.get(catalog.id)!;
    const featureTotal = acc.featureIds.size;
    const implementationTotal = acc.implementationTotal;
    const implementationAvailable = acc.implementationAvailable;
    const openGaps = Array.from(acc.featureIds).reduce(
      (sum, id) => sum + (gapsByFeature.get(id) ?? 0),
      0,
    );

    return {
      id: catalog.id,
      name: catalog.name,
      shortName: catalog.shortName,
      description: catalog.description,
      featureTotal,
      featureAvailable: implementationAvailable,
      featureInProgress: acc.inProgressIds.size,
      implementationTotal,
      implementationAvailable,
      coveragePercent:
        implementationTotal === 0
          ? 0
          : (implementationAvailable / implementationTotal) * 100,
      audienceCount: acc.audienceIds.size,
      channelCount: acc.channelIds.size,
      needCount: acc.userNeedIds.size,
      journeyCount: acc.journeyIds.size,
      momentCount: acc.momentIds.size,
      evolutionCount: evolutionCountByProduct.get(catalog.id) ?? 0,
      openGaps,
      owners: Array.from(acc.owners).sort((a, b) => a.localeCompare(b, "pt-BR")),
      stageCounts: acc.stageCounts,
      features: Array.from(acc.features.values())
        .map((f) => ({
          id: f.id,
          name: f.name,
          priority: f.priority,
          phase: f.phase,
          productOwner: f.productOwner,
          audienceCount: f.audiences.size,
          channelCount: f.channels.size,
          openGaps: gapsByFeature.get(f.id) ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      audiences: Array.from(acc.audienceIds)
        .map((id) => {
          const audience = db.audiences.find((a) => a.id === id);
          const scoped = rows.filter(
            (r) => r.productId === acc.id && r.audienceId === id,
          );
          const total = scoped.length;
          const available = scoped.filter(
            (r) => normalizeFeatureStage(r.phase) === "AVAILABLE",
          ).length;
          return {
            id,
            name: audience?.name ?? "Público",
            code: audience?.code,
            featureTotal: total,
            featureAvailable: available,
            coveragePercent: total === 0 ? 0 : (available / total) * 100,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      channels: Array.from(acc.channelIds)
        .map((id) => {
          const channel = db.channels.find((c) => c.id === id);
          const scoped = rows.filter(
            (r) => r.productId === acc.id && r.channelId === id,
          );
          const total = scoped.length;
          const available = scoped.filter(
            (r) => normalizeFeatureStage(r.phase) === "AVAILABLE",
          ).length;
          return {
            id,
            name: channel?.name ?? "Canal",
            featureTotal: total,
            featureAvailable: available,
            coveragePercent: total === 0 ? 0 : (available / total) * 100,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  });

  return (
    <ProdutosClient
      products={products}
      audiences={db.audiences
        .filter((a) => a.active)
        .map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
        }))}
      initialProduct={initialProduct}
    />
  );
}
