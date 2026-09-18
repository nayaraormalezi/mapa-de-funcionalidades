import { EditarJornadasClient } from "@/app/jornadas/editar/editar-jornadas-client";
import { getAuthState } from "@/lib/auth";
import { getDatabase } from "@/services/db";
import { redirect } from "next/navigation";

export default async function EditarJornadasPage({
  searchParams,
}: {
  searchParams: Promise<{ publico?: string }>;
}) {
  const auth = await getAuthState();
  if (!auth.canEdit) {
    redirect("/jornadas");
  }

  const { publico } = await searchParams;
  const db = await getDatabase();

  if (!publico) {
    redirect("/jornadas");
  }

  const audience = db.audiences.find((a) => a.id === publico && a.active);
  if (!audience) {
    redirect("/jornadas");
  }

  const catalogJourney =
    db.journeys.find((j) => j.active && j.id === "jrn-consorcio") ??
    db.journeys.find((j) => j.active);

  const stages = db.journeyAudienceStages.filter(
    (s) => s.audienceId === audience.id && s.active,
  );

  const catalogStages = db.journeyStages
    .filter(
      (s) =>
        s.active &&
        catalogJourney &&
        s.journeyId === catalogJourney.id,
    )
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <EditarJornadasClient
      audienceId={audience.id}
      audienceName={audience.name}
      moments={db.moments
        .filter((m) => m.active)
        .map((m) => ({ value: m.id, label: m.name }))}
      catalogJourneyId={catalogJourney?.id ?? "jrn-consorcio"}
      catalogStages={catalogStages}
      stages={stages}
    />
  );
}
