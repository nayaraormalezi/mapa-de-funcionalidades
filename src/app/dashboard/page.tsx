import { getAuthState } from "@/lib/auth";
import { PRODUCT_OPTIONS } from "@/lib/products";
import {
  buildFeatureMapRows,
  getAudiences,
  getMoments,
  getOfficialChannelMatrix,
} from "@/services/channels";
import { getDatabase } from "@/services/db";
import { getOpenGaps } from "@/services/gaps";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage() {
  const [auth, rows, audiences, moments, matrix, gaps, db] = await Promise.all([
    getAuthState(),
    buildFeatureMapRows(),
    getAudiences(),
    getMoments(),
    getOfficialChannelMatrix(),
    getOpenGaps(),
    getDatabase(),
  ]);

  const userName =
    auth.profile?.fullName?.trim().split(/\s+/)[0] ||
    auth.email?.split("@")[0]?.trim() ||
    "usuário";

  const products = PRODUCT_OPTIONS;

  const channelById = new Map(db.channels.map((c) => [c.id, c.name]));
  const audienceById = new Map(db.audiences.map((a) => [a.id, a.name]));
  const momentById = new Map(db.moments.map((m) => [m.id, m.name]));

  const gapMeta: Record<
    string,
    { audience: string; moment: string; channel: string }
  > = {};
  for (const gap of gaps) {
    const channelId = gap.futureChannelId ?? gap.currentChannelId;
    gapMeta[gap.id] = {
      audience: audienceById.get(gap.audienceId) ?? "—",
      moment: momentById.get(gap.momentId) ?? "—",
      channel: channelId ? (channelById.get(channelId) ?? "—") : "—",
    };
  }

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

  const updatedAtLabel = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardView
      userName={userName}
      rows={rows}
      audiences={audiences.map((a) => ({ value: a.id, label: a.name }))}
      moments={moments.map((m) => ({ value: m.id, label: m.name }))}
      products={products}
      gaps={gaps}
      gapMeta={gapMeta}
      channelTabs={channelTabs}
      updatedAtLabel={updatedAtLabel}
    />
  );
}
