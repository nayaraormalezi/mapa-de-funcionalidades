import { notFound } from "next/navigation";
import { FeatureSheet } from "@/components/feature/feature-sheet";
import { BackButton } from "@/components/ui/back-button";
import { withEvidenceFileUrls } from "@/lib/evidence-files";
import { PRODUCT_CATALOG } from "@/lib/products";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { getDatabase } from "@/services/db";
import {
  getFeatureById,
  getFeatureChannelEvaluations,
  getFeatureContexts,
  getFeatureEvidences,
  getFeatureEvolutions,
  getFeatureGaps,
  getFeatureHierarchy,
} from "@/services/features";

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const feature = await getFeatureById(id);
  if (!feature) notFound();

  const [db, hierarchy, contexts, evidencesRaw, evolutions, gaps, evaluations] =
    await Promise.all([
      getDatabase(),
      getFeatureHierarchy(id),
      getFeatureContexts(id),
      getFeatureEvidences(id),
      getFeatureEvolutions(id),
      getFeatureGaps(id),
      getFeatureChannelEvaluations(id),
    ]);

  const evidences = isSupabaseEnabled()
    ? await withEvidenceFileUrls(evidencesRaw)
    : evidencesRaw.map((e) => ({ ...e, fileUrl: null }));

  const activeChannelContexts = db.channelContexts.filter((cc) => cc.active);

  const channelContextMatrix = activeChannelContexts.map((cc) => ({
    id: cc.id,
    audienceId: cc.audienceId,
    momentId: cc.momentId,
    channelId: cc.channelId,
    temporalStatus: cc.temporalStatus,
  }));

  const productOptions = PRODUCT_CATALOG.map((p) => ({
    value: p.id,
    label: p.shortName,
  }));

  const journeyOptions = db.journeys.map((j) => ({
    value: j.id,
    label: j.name,
  }));

  const needOptions = db.userNeeds.map((n) => ({
    value: n.id,
    label: n.name,
  }));

  const audienceOptions = db.audiences.map((a) => ({
    value: a.id,
    label: a.name,
  }));

  const momentOptions = db.moments.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const channelOptions = db.channels.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="space-y-6">
      <BackButton href="/mapa" />
      <FeatureSheet
        feature={feature}
        hierarchy={{
          journey: hierarchy?.journey,
          userNeed: hierarchy?.userNeed,
          journeys: hierarchy?.journeys,
          userNeeds: hierarchy?.userNeeds,
        }}
        contexts={contexts}
        evolutions={evolutions}
        evaluations={evaluations}
        evidences={evidences}
        gaps={gaps}
        channelContextMatrix={channelContextMatrix}
        productOptions={productOptions}
        journeyOptions={journeyOptions}
        needOptions={needOptions}
        audienceOptions={audienceOptions}
        momentOptions={momentOptions}
        channelOptions={channelOptions}
      />
    </div>
  );
}
