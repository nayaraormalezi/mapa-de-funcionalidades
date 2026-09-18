import { getDatabase } from "@/services/db";
import {
  deriveDeadlineStatus,
  normalizeDeadlineStatus,
  normalizeFeatureStage,
} from "@/lib/labels";
import {
  buildChannelIntelligence,
  evaluationChannelKey,
  groupEvaluationsByChannel,
} from "@/lib/health";
import {
  appliesToProduct,
  getProductMeta,
  isProductId,
  parseProductId,
} from "@/lib/products";
import type {
  Channel,
  ChannelContext,
  FeatureMapRow,
  TemporalStatus,
  UserNeed,
} from "@/types";

export async function getAudiences() {
  return (await getDatabase()).audiences.filter((a) => a.active);
}

export async function getMoments() {
  return (await getDatabase()).moments.filter((m) => m.active);
}

export async function getProducts() {
  return (await getDatabase())
    .products.filter((p) => p.active)
    .sort((a, b) => a.order - b.order);
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
  const evalsByChannel = groupEvaluationsByChannel(
    db.featureChannelEvaluations,
  );

  return db.featureChannelContexts
    .map((fcc): FeatureMapRow | null => {
      const feature = db.features.find((f) => f.id === fcc.featureId);
      const channelContext = db.channelContexts.find(
        (cc) => cc.id === fcc.channelContextId,
      );
      if (!feature || !channelContext || !feature.active) return null;

      const productId = parseProductId(
        fcc.productId || feature.product || undefined,
      );
      if (!productId || !isProductId(productId)) return null;
      const productMeta =
        db.products.find((p) => p.id === productId) ?? getProductMeta(productId);

      const audience = db.audiences.find(
        (a) => a.id === channelContext.audienceId,
      );
      const moment = db.moments.find((m) => m.id === channelContext.momentId);
      const channel = db.channels.find(
        (c) => c.id === channelContext.channelId,
      );
      if (!audience || !moment || !channel) return null;

      // Hierarquia: Feature → Need / Journey via M2M (fallback Capability).
      // FCC is source of truth for existence — do not exclude when
      // feature.productIds omits this product.
      const linkedNeedIds =
        feature.needIds.length > 0
          ? feature.needIds
          : (db.featureNeeds ?? [])
              .filter((l) => l.featureId === feature.id)
              .map((l) => l.userNeedId);

      const linkedNeeds = linkedNeedIds
        .map((id) => db.userNeeds.find((n) => n.id === id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n));

      let userNeed: UserNeed | undefined =
        linkedNeeds.find((n) => appliesToProduct(n.productIds, productId)) ??
        linkedNeeds[0];

      let capability = feature.capabilityId
        ? db.capabilities.find((c) => c.id === feature.capabilityId)
        : undefined;

      if (!userNeed && capability) {
        userNeed = db.userNeeds.find((n) => n.id === capability!.userNeedId);
      }
      if (!capability && userNeed) {
        capability = db.capabilities.find((c) => c.userNeedId === userNeed!.id);
      }

      const linkedJourneyIds =
        feature.journeyIds.length > 0
          ? feature.journeyIds
          : (db.featureJourneys ?? [])
              .filter((l) => l.featureId === feature.id)
              .map((l) => l.journeyId);

      const journey =
        linkedJourneyIds
          .map((id) => db.journeys.find((j) => j.id === id))
          .find(Boolean) ??
        (userNeed
          ? db.journeys.find((j) => j.id === userNeed!.journeyId)
          : undefined);

      if (!userNeed || !journey) return null;

      const journeyStage = userNeed.journeyStageId
        ? db.journeyStages.find((s) => s.id === userNeed.journeyStageId)
        : undefined;

      const stage = normalizeFeatureStage(fcc.phase || fcc.status);
      const status =
        fcc.status === "ON_TRACK" ||
        fcc.status === "DELAYED" ||
        fcc.status === "NO_DEADLINE"
          ? normalizeDeadlineStatus(fcc.status)
          : deriveDeadlineStatus(fcc.expectedDate, stage);

      const evalKey = evaluationChannelKey(feature.id, channelContext.id);
      const channelIntel = buildChannelIntelligence(
        evalsByChannel.get(evalKey) ?? [],
      );

      return {
        featureId: feature.id,
        featureName: feature.name,
        featureDescription: feature.description,
        productId: productMeta.id,
        product: productMeta.name,
        productShortName: productMeta.shortName,
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
        journeyStageId: journeyStage?.id ?? userNeed.journeyStageId ?? null,
        journeyStageName: journeyStage?.name ?? null,
        userNeedId: userNeed.id,
        userNeedName: userNeed.name,
        capabilityId: capability?.id ?? "",
        capabilityName: capability?.name ?? "",
        channelId: channel.id,
        channelName: channel.name,
        channelContextId: channelContext.id,
        temporalStatus: channelContext.temporalStatus,
        featureChannelContextId: fcc.id,
        status,
        experience: fcc.experience,
        healthScore: channelIntel.healthScore,
        healthSignal: channelIntel.healthSignal,
        phase: stage,
        startDate: fcc.startDate,
        expectedDate: fcc.expectedDate,
        launchDate: fcc.launchDate,
        responsible: fcc.responsible,
        notes: fcc.notes,
        figmaUrl: fcc.figmaUrl ?? null,
        experienceImageUrl: fcc.experienceImageUrl ?? null,
        experienceUrl: fcc.experienceUrl ?? null,
        ticketNumber: fcc.ticketNumber?.trim()
          ? fcc.ticketNumber.trim()
          : null,
        evaluationNotes: fcc.evaluationNotes ?? "",
        researchDate: fcc.researchDate ?? null,
        researchFilePath: fcc.researchFilePath ?? null,
        researchFileName: fcc.researchFileName ?? null,
        researchFileMime: fcc.researchFileMime ?? null,
        researchFileSize: fcc.researchFileSize ?? null,
        needsEvolution: Boolean(fcc.needsEvolution),
      };
    })
    .filter((row): row is FeatureMapRow => row !== null);
}
