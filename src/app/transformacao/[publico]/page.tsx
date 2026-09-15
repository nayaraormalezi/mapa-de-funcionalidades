import { TransformacaoAudienceGate } from "@/app/transformacao/transformacao-audience-gate";
import { TransformacaoClient } from "@/app/transformacao/transformacao-client";
import { getAudiences, getMoments } from "@/services/channels";
import {
  getMigrationRoadmapRows,
  getTransformationSummaries,
} from "@/services/transformation";

export const dynamic = "force-dynamic";

export default async function TransformacaoPublicoPage({
  params,
}: {
  params: Promise<{ publico: string }>;
}) {
  const { publico } = await params;
  const audiences = await getAudiences();
  const audience = audiences.find((a) => a.id === publico && a.active);

  const audienceOptions = audiences.map((a) => ({
    id: a.id,
    name: a.name,
    code: a.code,
    description: a.description,
  }));

  if (!audience) {
    return <TransformacaoAudienceGate audiences={audienceOptions} />;
  }

  const [summaries, migrations, moments] = await Promise.all([
    getTransformationSummaries(),
    getMigrationRoadmapRows({ audienceId: audience.id }),
    getMoments(),
  ]);

  return (
    <TransformacaoClient
      key={audience.id}
      audienceId={audience.id}
      audienceName={audience.name}
      summaries={summaries.filter((s) => s.audienceId === audience.id)}
      migrations={migrations.map(({ current, future }) => ({
        current: {
          featureChannelContextId: current.featureChannelContextId,
          featureId: current.featureId,
          featureName: current.featureName,
          channelName: current.channelName,
          audienceName: current.audienceName,
          momentName: current.momentName,
          audienceId: current.audienceId,
          momentId: current.momentId,
          channelId: current.channelId,
          status: current.status,
        },
        future: future
          ? {
              featureChannelContextId: future.featureChannelContextId,
              channelName: future.channelName,
              status: future.status,
              channelId: future.channelId,
            }
          : null,
      }))}
      moments={moments.map((m) => ({ id: m.id, name: m.name }))}
      audiences={audienceOptions}
    />
  );
}
