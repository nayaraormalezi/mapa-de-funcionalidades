import { TransformacaoAudienceGate } from "@/app/transformacao/transformacao-audience-gate";
import { getAudiences } from "@/services/channels";
import { redirect } from "next/navigation";

/** Escolha do público — a visão Atual → Futuro fica em /transformacao/[publico]. */
export default async function TransformacaoIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ publico?: string }>;
}) {
  const { publico } = await searchParams;
  if (publico) {
    redirect(`/transformacao/${publico}`);
  }

  const audiences = await getAudiences();

  return (
    <TransformacaoAudienceGate
      audiences={audiences.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        description: a.description,
      }))}
    />
  );
}
