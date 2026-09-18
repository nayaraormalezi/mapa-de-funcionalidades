import { redirect } from "next/navigation";

/** @deprecated Fase 13 — use `/inteligencia/transformacoes/[publico]`. */
export default async function TransformacaoPublicoRedirectPage({
  params,
}: {
  params: Promise<{ publico: string }>;
}) {
  const { publico } = await params;
  redirect(`/inteligencia/transformacoes/${publico}`);
}
