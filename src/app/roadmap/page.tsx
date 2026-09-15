import { RoadmapClient } from "@/app/roadmap/roadmap-client";
import { getAuthState } from "@/lib/auth";
import {
  normalizeFeatureStatus,
  officialStatusCatalog,
} from "@/lib/labels";
import { getDatabase } from "@/services/db";

export default async function RoadmapPage() {
  const [db, auth] = await Promise.all([getDatabase(), getAuthState()]);

  const audiences = db.audiences
    .filter((a) => a.active)
    .map((a) => ({ id: a.id, name: a.name }));
  const moments = db.moments
    .filter((m) => m.active)
    .map((m) => ({ id: m.id, name: m.name }));
  const channels = db.channels
    .filter((c) => c.active)
    .map((c) => ({ id: c.id, name: c.name }));

  const phases = officialStatusCatalog();

  const featuresById = new Map(db.features.map((f) => [f.id, f]));
  const contextsById = new Map(db.channelContexts.map((c) => [c.id, c]));
  const channelsById = new Map(db.channels.map((c) => [c.id, c]));

  const items = db.roadmapItems
    .map((item) => {
      const feature = featuresById.get(item.featureId);
      if (!feature || !feature.active) return null;

      const context = item.channelContextId
        ? contextsById.get(item.channelContextId)
        : undefined;
      const audience = context
        ? audiences.find((a) => a.id === context.audienceId)
        : undefined;
      const moment = context
        ? moments.find((m) => m.id === context.momentId)
        : undefined;
      const channel = context
        ? channelsById.get(context.channelId)
        : undefined;

      const fcc = db.featureChannelContexts.find(
        (f) =>
          f.featureId === item.featureId &&
          (!item.channelContextId ||
            f.channelContextId === item.channelContextId),
      );

      const status = normalizeFeatureStatus(
        fcc?.status ?? item.phase ?? "BACKLOG",
      );

      return {
        id: item.id,
        featureId: feature.id,
        featureName: feature.name,
        phase: status,
        status,
        startDate: item.startDate,
        expectedDate: item.expectedDate,
        actualDate: item.actualDate,
        responsible: item.responsible,
        notes: item.notes,
        channelContextId: item.channelContextId,
        audienceId: audience?.id ?? "",
        audienceName: audience?.name ?? "Sem contexto",
        momentId: moment?.id ?? "",
        momentName: moment?.name ?? "Geral",
        channelId: channel?.id ?? "",
        channelName: channel?.name ?? null,
        priority: feature.priority,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <RoadmapClient
      items={items}
      audiences={audiences}
      moments={moments}
      channels={channels}
      phases={phases}
      canEdit={auth.canEdit}
    />
  );
}
