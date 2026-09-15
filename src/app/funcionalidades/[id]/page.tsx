import Link from "next/link";
import { notFound } from "next/navigation";
import { GovernanceHub } from "@/components/feature/governance-hub";
import { Button } from "@/components/ui/button";
import { withEvidenceFileUrls } from "@/lib/evidence-files";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { getDatabase } from "@/services/db";
import {
  getFeatureById,
  getFeatureContexts,
  getFeatureEvidences,
  getFeatureGaps,
  getFeatureHierarchy,
  getFeatureRoadmap,
} from "@/services/features";
import { ArrowLeft } from "lucide-react";

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const feature = await getFeatureById(id);
  if (!feature) notFound();

  const [db, hierarchy, contexts, evidencesRaw, roadmap, gaps] =
    await Promise.all([
      getDatabase(),
      getFeatureHierarchy(id),
      getFeatureContexts(id),
      getFeatureEvidences(id),
      getFeatureRoadmap(id),
      getFeatureGaps(id),
    ]);

  const evidences = isSupabaseEnabled()
    ? await withEvidenceFileUrls(evidencesRaw)
    : evidencesRaw.map((e) => ({ ...e, fileUrl: null }));

  const channelContextOptions = db.channelContexts
    .filter((cc) => cc.active)
    .map((cc) => {
      const audience = db.audiences.find((a) => a.id === cc.audienceId)?.name;
      const moment = db.moments.find((m) => m.id === cc.momentId)?.name;
      const channel = db.channels.find((c) => c.id === cc.channelId)?.name;
      return {
        value: cc.id,
        label: `${audience} · ${moment} · ${channel} (${cc.temporalStatus})`,
      };
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/mapa">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao mapa
          </Link>
        </Button>
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
          Gerencie status por contexto, roadmap, evidências, responsáveis e
          gaps em um único lugar.
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
        gaps={gaps}
        channelContextOptions={channelContextOptions}
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
