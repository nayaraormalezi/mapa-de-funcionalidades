import { EditarJornadasClient } from "@/app/jornadas/editar/editar-jornadas-client";
import { getDatabase } from "@/services/db";
import { redirect } from "next/navigation";

export default async function EditarJornadasPage({
  searchParams,
}: {
  searchParams: Promise<{ publico?: string }>;
}) {
  const { publico } = await searchParams;
  const db = await getDatabase();

  if (!publico) {
    redirect("/jornadas");
  }

  const audience = db.audiences.find((a) => a.id === publico && a.active);
  if (!audience) {
    redirect("/jornadas");
  }

  const stages = db.journeyAudienceStages.filter(
    (s) => s.audienceId === audience.id && s.active,
  );

  return (
    <EditarJornadasClient
      audienceId={audience.id}
      audienceName={audience.name}
      moments={db.moments
        .filter((m) => m.active)
        .map((m) => ({ value: m.id, label: m.name }))}
      catalogJourneys={db.journeys
        .filter((j) => j.active)
        .sort((a, b) => a.order - b.order)
        .map((j) => ({ value: j.id, label: j.name }))}
      stages={stages}
    />
  );
}
