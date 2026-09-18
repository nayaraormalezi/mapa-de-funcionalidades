import { redirect } from "next/navigation";

/** Legado: Insights deixou de ser página — redireciona ao hub de Inteligência. */
export default function InteligenciaInsightsRedirect() {
  redirect("/inteligencia");
}
