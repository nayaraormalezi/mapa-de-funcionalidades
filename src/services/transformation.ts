import {
  buildFeatureMapRows,
  getAudiences,
  getChannelContexts,
  getChannels,
  getMoments,
} from "@/services/channels";
import { getGaps } from "@/services/gaps";
import type {
  ChannelComparison,
  Feature,
  FeatureMapRow,
  TransformationSummary,
} from "@/types";
import { getFeatures } from "@/services/features";

function isPresent(phase: string) {
  return phase !== "REMOVED";
}

function featureIdsOnChannel(
  rows: FeatureMapRow[],
  channelId: string,
  temporal?: "CURRENT" | "FUTURE",
): Set<string> {
  return new Set(
    rows
      .filter(
        (r) =>
          r.channelId === channelId &&
          (!temporal || r.temporalStatus === temporal) &&
          isPresent(r.phase),
      )
      .map((r) => r.featureId),
  );
}

export async function getTransformationSummaries(): Promise<
  TransformationSummary[]
> {
  const rows = await buildFeatureMapRows();
  const summaries: TransformationSummary[] = [];
  const audiences = await getAudiences();
  const moments = await getMoments();
  const contexts = await getChannelContexts();
  const channels = await getChannels();

  for (const audience of audiences) {
    for (const moment of moments) {
      const scopedContexts = contexts.filter(
        (cc) =>
          cc.audienceId === audience.id && cc.momentId === moment.id,
      );
      const currentContexts = scopedContexts.filter(
        (c) => c.temporalStatus === "CURRENT",
      );
      const futureContexts = scopedContexts.filter(
        (c) => c.temporalStatus === "FUTURE",
      );

      if (currentContexts.length === 0 && futureContexts.length === 0) {
        continue;
      }

      const scopedRows = rows.filter(
        (r) => r.audienceId === audience.id && r.momentId === moment.id,
      );

      const currentChannelIds = new Set(
        currentContexts.map((c) => c.channelId),
      );
      const futureChannelIds = new Set(futureContexts.map((c) => c.channelId));

      const currentFeatureIds = new Set(
        scopedRows
          .filter(
            (r) =>
              currentChannelIds.has(r.channelId) && isPresent(r.status),
          )
          .map((r) => r.featureId),
      );
      const futureFeatureIds = new Set(
        scopedRows
          .filter(
            (r) =>
              futureChannelIds.has(r.channelId) &&
              isPresent(r.phase),
          )
          .map((r) => r.featureId),
      );
      const futureUndefined = new Set(
        scopedRows
          .filter(
            (r) =>
              futureChannelIds.has(r.channelId) && r.phase === "REMOVED",
          )
          .map((r) => r.featureId),
      );
      const discontinued = new Set(
        scopedRows
          .filter((r) => r.phase === "REMOVED")
          .map((r) => r.featureId),
      );

      const pickRepresentative = (featureId: string) =>
        scopedRows.find((r) => r.featureId === featureId)!;

      const remain: FeatureMapRow[] = [];
      const migrate: FeatureMapRow[] = [];
      const create: FeatureMapRow[] = [];
      const discontinue: FeatureMapRow[] = [];
      const undefinedRows: FeatureMapRow[] = [];

      for (const featureId of currentFeatureIds) {
        if (futureFeatureIds.has(featureId)) {
          migrate.push(pickRepresentative(featureId));
        } else if (futureUndefined.has(featureId)) {
          undefinedRows.push(pickRepresentative(featureId));
        } else if (discontinued.has(featureId)) {
          discontinue.push(pickRepresentative(featureId));
        } else if (futureChannelIds.size === 0) {
          remain.push(pickRepresentative(featureId));
        } else {
          undefinedRows.push(pickRepresentative(featureId));
        }
      }

      for (const featureId of futureFeatureIds) {
        if (!currentFeatureIds.has(featureId)) {
          create.push(pickRepresentative(featureId));
        }
      }

      summaries.push({
        audienceId: audience.id,
        audienceName: audience.name,
        momentId: moment.id,
        momentName: moment.name,
        currentChannels: currentContexts.map((c) => ({
          id: c.channelId,
          name:
            channels.find((ch) => ch.id === c.channelId)?.name ?? c.channelId,
        })),
        futureChannels: futureContexts.map((c) => ({
          id: c.channelId,
          name:
            channels.find((ch) => ch.id === c.channelId)?.name ?? c.channelId,
        })),
        remain,
        migrate,
        create,
        discontinue,
        undefined: undefinedRows,
      });
    }
  }

  return summaries;
}

export async function compareChannels(
  channelAId: string,
  channelBId: string,
): Promise<ChannelComparison> {
  const rows = await buildFeatureMapRows();
  const features = await getFeatures();
  const idsA = featureIdsOnChannel(rows, channelAId);
  const idsB = featureIdsOnChannel(rows, channelBId);

  const toFeatures = (ids: Set<string>): Feature[] =>
    features.filter((f) => ids.has(f.id));

  const commonIds = new Set([...idsA].filter((id) => idsB.has(id)));
  const onlyA = new Set([...idsA].filter((id) => !idsB.has(id)));
  const onlyB = new Set([...idsB].filter((id) => !idsA.has(id)));

  const gaps = (await getGaps()).filter(
    (g) =>
      g.currentChannelId === channelAId ||
      g.currentChannelId === channelBId ||
      g.futureChannelId === channelAId ||
      g.futureChannelId === channelBId,
  );

  return {
    channelAId,
    channelBId,
    common: toFeatures(commonIds),
    onlyA: toFeatures(onlyA),
    onlyB: toFeatures(onlyB),
    gaps,
  };
}

export async function getMigrationRoadmapRows(filters?: {
  audienceId?: string;
  momentId?: string;
  currentChannelId?: string;
  futureChannelId?: string;
  status?: string;
}) {
  const rows = await buildFeatureMapRows();
  const migrations: {
    current: FeatureMapRow;
    future: FeatureMapRow | null;
  }[] = [];

  const currentRows = rows.filter((r) => {
    if (r.temporalStatus !== "CURRENT") return false;
    if (filters?.audienceId && r.audienceId !== filters.audienceId)
      return false;
    if (filters?.momentId && r.momentId !== filters.momentId) return false;
    if (
      filters?.currentChannelId &&
      r.channelId !== filters.currentChannelId
    )
      return false;
    if (!isPresent(r.phase)) return false;
    return true;
  });

  for (const current of currentRows) {
    const future = rows.find(
      (r) =>
        r.featureId === current.featureId &&
        r.audienceId === current.audienceId &&
        r.momentId === current.momentId &&
        r.temporalStatus === "FUTURE" &&
        (!filters?.futureChannelId ||
          r.channelId === filters.futureChannelId) &&
        (!filters?.status || r.status === filters.status),
    );

    if (filters?.futureChannelId && !future) continue;
    if (filters?.status && !future) continue;

    migrations.push({ current, future: future ?? null });
  }

  return migrations;
}
