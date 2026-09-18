import { getReportPayload } from "@/services/relatorios";
import { RelatoriosClient } from "./relatorios-client";

export default async function RelatoriosPage() {
  const data = await getReportPayload();
  return <RelatoriosClient data={data} />;
}
