import Link from "next/link";
import { notFound } from "next/navigation";
import { GovernanceHub } from "@/components/feature/governance-hub";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { withEvidenceFileUrls } from "@/lib/evidence-files";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { getDatabase } from "@/services/db";
import {
  getFeatureById,
  getFeatureContexts,
  getFeatureEvidences,
  getFeatureEvolutions,
  getFeatureGaps,
  getFeatureHierarchy,
  getFeatureRoadmap,
} from "@/services/features";

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const feature = await getFeatureById(id);
  if (!feature) notFound();

  const [db, hierarchy, contexts, evidencesRaw, roadmap, evolutions, gaps] =
    await Promise.all([
      getDatabase(),
      getFeatureHierarchy(id),
      getFeatureContexts(id),
      getFeatureEvidences(id),
      getFeatureRoadmap(id),
      getFeatureEvolutions(id),
      getFeatureGaps(id),
    ]);

  const evidences = isSupabaseEnabled()
    ? await withEvidenceFileUrls(evidencesRaw)
    : evidencesRaw.map((e) => ({ ...e, fileUrl: null }));

  const activeChannelContexts = db.channelContexts.filter((cc) => cc.active);

  const channelContextOptions = activeChannelContexts.map((cc) => {
    const audience = db.audiences.find((a) => a.id === cc.audienceId)?.name;
    const moment = db.moments.find((m) => m.id === cc.momentId)?.name;
    const channel = db.channels.find((c) => c.id === cc.channelId)?.name;
    return {
      value: cc.id,
      label: `${audience} · ${moment} · ${channel} (${cc.temporalStatus})`,
    };
  });

  const channelContextMatrix = activeChannelContexts.map((cc) => ({
    id: cc.id,
    audienceId: cc.audienceId,
    momentId: cc.momentId,
    channelId: cc.channelId,
    temporalStatus: cc.temporalStatus,
  }));

  const fccOptions = contexts.map((c) => ({
    value: c.featureChannelContextId,
    label: `${c.productShortName} · ${c.channelName} · ${c.audienceName} · ${c.momentName}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton href="/mapa" />
        <Button asChild variant="outline" size="sm">
          <Link href={`/cadastros/funcionalidades?edit=${feature.id}`}>
            Cadastro completo
          </Link>
        </Button>
      </div>

      <section className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
          Governança da funcionalidade · Fase 3
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {feature.name}
        </h1>
        <p className="max-w-3xl text-sm text-[var(--muted-foreground)]">
          Gerencie status por contexto, evoluções, roadmap, evidências,
          responsáveis e gaps em um único lugar.
        </p>
      </section>

      <GovernanceHub
        feature={feature}
        hierarchy={{
          journey: hierarchy?.journey,
          userNeed: hierarchy?.userNeed,
          capability: hierarchy?.capability,
        }}
        contexts={contexts}
        evidences={evidences}
        roadmap={roadmap}
        evolutions={evolutions}
        gaps={gaps}
        channelContextOptions={channelContextOptions}
        channelContextMatrix={channelContextMatrix}
        fccOptions={fccOptions}
        audienceOptions={db.audiences.map((a) => ({
          value: a.id,
          label: a.name,
        }))}
        momentOptions={db.moments.map((m) => ({
          value: m.id,
          label: m.name,
        }))}
        journeyOptions={db.journeys.map((j) => ({
          value: j.id,
          label: j.name,
        }))}
        userNeedOptions={db.userNeeds.map((n) => ({
          value: n.id,
          label: n.name,
        }))}
        channelOptions={db.channels.map((c) => ({
          value: c.id,
          label: c.name,
        }))}
      />
    </div>
  );
}
