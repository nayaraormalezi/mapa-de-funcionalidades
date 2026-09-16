import { getDatabase } from "@/services/db";
import {
  deriveDeadlineStatus,
  normalizeDeadlineStatus,
  normalizeFeatureStage,
} from "@/lib/labels";
import type {
  Channel,
  ChannelContext,
  FeatureMapRow,
  TemporalStatus,
} from "@/types";

export async function getAudiences() {
  return (await getDatabase()).audiences.filter((a) => a.active);
}

export async function getMoments() {
  return (await getDatabase()).moments.filter((m) => m.active);
}

export async function getJourneys() {
  return (await getDatabase())
    .journeys.filter((j) => j.active)
    .sort((a, b) => a.order - b.order);
}

export async function getChannels(): Promise<Channel[]> {
  return (await getDatabase()).channels.filter((c) => c.active);
}

export async function getChannelContexts(): Promise<ChannelContext[]> {
  return (await getDatabase()).channelContexts.filter((c) => c.active);
}

export async function getChannelById(id: string): Promise<Channel | undefined> {
  return (await getChannels()).find((c) => c.id === id);
}

export async function getChannelContextLabel(
  context: ChannelContext,
): Promise<string> {
  const db = await getDatabase();
  const audience = db.audiences.find((a) => a.id === context.audienceId)?.name;
  const moment = db.moments.find((m) => m.id === context.momentId)?.name;
  const channel = db.channels.find((c) => c.id === context.channelId)?.name;
  return `${audience} · ${moment} · ${channel}`;
}

export async function getOfficialChannelMatrix() {
  const db = await getDatabase();
  const audiences = await getAudiences();
  const moments = await getMoments();
  const contexts = await getChannelContexts();

  return audiences.map((audience) => ({
    audience,
    moments: moments.map((moment) => ({
      moment,
      channels: contexts
        .filter(
          (cc) =>
            cc.audienceId === audience.id && cc.momentId === moment.id,
        )
        .map((cc) => ({
          context: cc,
          channel: db.channels.find((c) => c.id === cc.channelId)!,
          temporalStatus: cc.temporalStatus as TemporalStatus,
        })),
    })),
  }));
}

export async function buildFeatureMapRows(): Promise<FeatureMapRow[]> {
  const db = await getDatabase();

  return db.featureChannelContexts
    .map((fcc): FeatureMapRow | null => {
      const feature = db.features.find((f) => f.id === fcc.featureId);
      const channelContext = db.channelContexts.find(
        (cc) => cc.id === fcc.channelContextId,
      );
      if (!feature || !channelContext || !feature.active) return null;

      const audience = db.audiences.find(
        (a) => a.id === channelContext.audienceId,
      );
      const moment = db.moments.find((m) => m.id === channelContext.momentId);
      const channel = db.channels.find(
        (c) => c.id === channelContext.channelId,
      );
      const capability = db.capabilities.find(
        (c) => c.id === feature.capabilityId,
      );
      const userNeed = capability
        ? db.userNeeds.find((n) => n.id === capability.userNeedId)
        : undefined;
      const journey = userNeed
        ? db.journeys.find((j) => j.id === userNeed.journeyId)
        : undefined;

      if (
        !audience ||
        !moment ||
        !channel ||
        !capability ||
        !userNeed ||
        !journey
      ) {
        return null;
      }

      const stage = normalizeFeatureStage(fcc.phase || fcc.status);
      const status =
        fcc.status === "ON_TRACK" ||
        fcc.status === "DELAYED" ||
        fcc.status === "NO_DEADLINE"
          ? normalizeDeadlineStatus(fcc.status)
          : deriveDeadlineStatus(fcc.expectedDate, stage);

      return {
        featureId: feature.id,
        featureName: feature.name,
        featureDescription: feature.description,
        product: feature.product,
        priority: feature.priority,
        owner: feature.owner,
        uxOwner: feature.uxOwner,
        cxOwner: feature.cxOwner,
        productOwner: feature.productOwner,
        isDemo: feature.isDemo,
        audienceId: audience.id,
        audienceCode: audience.code,
        audienceName: audience.name,
        momentId: moment.id,
        momentCode: moment.code,
        momentName: moment.name,
        journeyId: journey.id,
        journeyName: journey.name,
        userNeedId: userNeed.id,
        userNeedName: userNeed.name,
        capabilityId: capability.id,
        capabilityName: capability.name,
        channelId: channel.id,
        channelName: channel.name,
        channelContextId: channelContext.id,
        temporalStatus: channelContext.temporalStatus,
        featureChannelContextId: fcc.id,
        status,
        experience: fcc.experience,
        phase: stage,
        startDate: fcc.startDate,
        expectedDate: fcc.expectedDate,
        launchDate: fcc.launchDate,
        responsible: fcc.responsible,
        notes: fcc.notes,
      };
    })
    .filter((row): row is FeatureMapRow => row !== null);
}
