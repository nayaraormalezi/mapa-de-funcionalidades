import { TransformacaoAudienceGate } from "@/app/transformacao/transformacao-audience-gate";
import { getAudiences } from "@/services/channels";
import { redirect } from "next/navigation";

/** Transformação Atual → Futuro — escolha de público (domínio Intelligence). */
export default async function InteligenciaTransformacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ publico?: string }>;
}) {
  const { publico } = await searchParams;
  if (publico) {
    redirect(`/inteligencia/transformacoes/${publico}`);
  }

  const audiences = await getAudiences();

  return (
    <TransformacaoAudienceGate
      basePath="/inteligencia/transformacoes"
      audiences={audiences.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        description: a.description,
      }))}
    />
  );
}
