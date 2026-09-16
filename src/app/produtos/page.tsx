import { ProdutosClient } from "@/app/produtos/produtos-client";
import { buildFeatureMapRows } from "@/services/channels";
import { getDatabase } from "@/services/db";
import { DEVELOPMENT_STAGES, normalizeFeatureStage } from "@/lib/labels";
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

  type Acc = {
    name: string;
    featureIds: Set<string>;
    availableIds: Set<string>;
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

  const byProduct = new Map<string, Acc>();

  for (const row of rows) {
    const name = row.product?.trim() || "Sem produto";
    let acc = byProduct.get(name);
    if (!acc) {
      acc = {
        name,
        featureIds: new Set(),
        availableIds: new Set(),
        inProgressIds: new Set(),
        audienceIds: new Set(),
        channelIds: new Set(),
        journeyIds: new Set(),
        momentIds: new Set(),
        owners: new Set(),
        stageCounts: {},
        features: new Map(),
      };
      byProduct.set(name, acc);
    }

    const isNewFeature = !acc.featureIds.has(row.featureId);
    acc.featureIds.add(row.featureId);
    acc.audienceIds.add(row.audienceId);
    acc.channelIds.add(row.channelId);
    acc.journeyIds.add(row.journeyId);
    acc.momentIds.add(row.momentId);
    if (row.productOwner) acc.owners.add(row.productOwner);

    const phase = normalizeFeatureStage(row.phase);
    if (phase === "AVAILABLE") acc.availableIds.add(row.featureId);
    if (DEVELOPMENT_STAGES.includes(phase)) acc.inProgressIds.add(row.featureId);

    if (isNewFeature) {
      acc.stageCounts[phase] = (acc.stageCounts[phase] ?? 0) + 1;
    }

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

  const products = Array.from(byProduct.values())
    .map((acc) => {
      const featureTotal = acc.featureIds.size;
      const featureAvailable = acc.availableIds.size;
      const openGaps = Array.from(acc.featureIds).reduce(
        (sum, id) => sum + (gapsByFeature.get(id) ?? 0),
        0,
      );

      return {
        name: acc.name,
        featureTotal,
        featureAvailable,
        featureInProgress: acc.inProgressIds.size,
        coveragePercent:
          featureTotal === 0 ? 0 : (featureAvailable / featureTotal) * 100,
        audienceCount: acc.audienceIds.size,
        channelCount: acc.channelIds.size,
        journeyCount: acc.journeyIds.size,
        momentCount: acc.momentIds.size,
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
            const audienceRows = rows.filter(
              (r) =>
                r.product === acc.name &&
                r.audienceId === id,
            );
            const featureIds = new Set(audienceRows.map((r) => r.featureId));
            const available = new Set(
              audienceRows
                .filter((r) => normalizeFeatureStage(r.phase) === "AVAILABLE")
                .map((r) => r.featureId),
            );
            return {
              id,
              name: audience?.name ?? "Público",
              code: audience?.code,
              featureTotal: featureIds.size,
              featureAvailable: available.size,
              coveragePercent:
                featureIds.size === 0
                  ? 0
                  : (available.size / featureIds.size) * 100,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        channels: Array.from(acc.channelIds)
          .map((id) => {
            const channel = db.channels.find((c) => c.id === id);
            const channelRows = rows.filter(
              (r) => r.product === acc.name && r.channelId === id,
            );
            const featureIds = new Set(channelRows.map((r) => r.featureId));
            const available = new Set(
              channelRows
                .filter((r) => normalizeFeatureStage(r.phase) === "AVAILABLE")
                .map((r) => r.featureId),
            );
            return {
              id,
              name: channel?.name ?? "Canal",
              featureTotal: featureIds.size,
              featureAvailable: available.size,
              coveragePercent:
                featureIds.size === 0
                  ? 0
                  : (available.size / featureIds.size) * 100,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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
