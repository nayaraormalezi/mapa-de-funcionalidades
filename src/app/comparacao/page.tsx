import { redirect } from "next/navigation";

/** @deprecated Fase 13 — use `/inteligencia/comparacoes`. */
export default function ComparacaoRedirectPage() {
  redirect("/inteligencia/comparacoes");
}
