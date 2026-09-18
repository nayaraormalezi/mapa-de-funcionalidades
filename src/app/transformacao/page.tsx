import { redirect } from "next/navigation";

/** @deprecated Fase 13 — use `/inteligencia/transformacoes`. */
export default async function TransformacaoRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ publico?: string }>;
}) {
  const { publico } = await searchParams;
  if (publico) {
    redirect(`/inteligencia/transformacoes/${publico}`);
  }
  redirect("/inteligencia/transformacoes");
}
