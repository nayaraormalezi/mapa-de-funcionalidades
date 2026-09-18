import { CanaisClient } from "@/app/canais/canais-client";
import {
  buildFeatureMapRows,
  getOfficialChannelMatrix,
} from "@/services/channels";
import { getDatabase } from "@/services/db";

export default async function CanaisPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const { channel: initialChannelId } = await searchParams;
  const [db, rows, matrix] = await Promise.all([
    getDatabase(),
    buildFeatureMapRows(),
    getOfficialChannelMatrix(),
  ]);

  const audiences = new Map(db.audiences.map((a) => [a.id, a]));
  const moments = new Map(db.moments.map((m) => [m.id, m]));
  const channels = new Map(db.channels.map((c) => [c.id, c]));

  const contextStats = new Map<
    string,
    { total: number; available: number }
  >();
  for (const row of rows) {
    const entry = contextStats.get(row.channelContextId) ?? {
      total: 0,
      available: 0,
    };
    entry.total += 1;
    if (row.phase === "AVAILABLE") entry.available += 1;
    contextStats.set(row.channelContextId, entry);
  }

  const contexts = db.channelContexts
    .filter((cc) => cc.active)
    .map((cc) => {
      const channel = channels.get(cc.channelId);
      const audience = audiences.get(cc.audienceId);
      const moment = moments.get(cc.momentId);
      const stats = contextStats.get(cc.id);
      const total = stats?.total ?? 0;
      const available = stats?.available ?? 0;
      return {
        id: cc.id,
        channelId: cc.channelId,
        channelName: channel?.name ?? "Canal",
        channelType: channel?.type ?? "",
        channelDescription: channel?.description ?? "",
        audienceId: cc.audienceId,
        audienceName: audience?.name ?? "",
        momentId: cc.momentId,
        momentName: moment?.name ?? "",
        temporalStatus: cc.temporalStatus,
        notes: cc.notes,
        coveragePercent: total === 0 ? 0 : (available / total) * 100,
        featureTotal: total,
        featureAvailable: available,
      };
    })
    .sort((a, b) => a.channelName.localeCompare(b.channelName, "pt-BR"));

  const channelTabs = matrix.map((entry) => ({
    id: entry.audience.id,
    label: entry.audience.name,
    moments: entry.moments.map((m) => ({
      momentName: m.moment.name,
      current: m.channels
        .filter((c) => c.temporalStatus === "CURRENT")
        .map((c) => c.channel.name),
      future: m.channels
        .filter((c) => c.temporalStatus === "FUTURE")
        .map((c) => c.channel.name),
    })),
  }));

  return (
    <CanaisClient
      contexts={contexts}
      audiences={db.audiences
        .filter((a) => a.active)
        .map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          description: a.description,
        }))}
      channelTabs={channelTabs}
      initialChannelId={initialChannelId}
    />
  );
}
