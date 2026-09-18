import { ComparacaoClient } from "@/app/comparacao/comparacao-client";
import { getChannels } from "@/services/channels";
import { getAdvancedComparison } from "@/services/intelligence";
import { compareChannels } from "@/services/transformation";

/**
 * Comparison — análise Canal × Canal dentro de Intelligence.
 * Fonte: FeatureMapRow (Implementation) + Issues persistidas + Health canônico.
 */
export default async function InteligenciaComparacoesPage() {
  const channels = await getChannels();
  const channelA = channels[2]?.id ?? channels[0]?.id ?? "";
  const channelB = channels[5]?.id ?? channels[1]?.id ?? "";

  const [initialComparison, initialAdvanced] =
    channelA && channelB
      ? await Promise.all([
          compareChannels(channelA, channelB),
          getAdvancedComparison(channelA, channelB),
        ])
      : [null, null];

  return (
    <ComparacaoClient
      channels={channels.map((c) => ({ id: c.id, name: c.name }))}
      initialChannelA={channelA}
      initialChannelB={channelB}
      initialComparison={initialComparison}
      initialAdvanced={initialAdvanced}
    />
  );
}
