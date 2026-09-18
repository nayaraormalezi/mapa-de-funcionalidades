import { EditarCanaisClient } from "@/app/canais/editar/editar-canais-client";
import { getAuthState } from "@/lib/auth";
import { getDatabase } from "@/services/db";
import { redirect } from "next/navigation";

export default async function EditarCanaisPage({
  searchParams,
}: {
  searchParams: Promise<{ publico?: string }>;
}) {
  const auth = await getAuthState();
  if (!auth.canEdit) {
    redirect("/canais");
  }

  const { publico } = await searchParams;
  const db = await getDatabase();

  if (!publico) {
    redirect("/canais");
  }

  const audience = db.audiences.find((a) => a.id === publico && a.active);
  if (!audience) {
    redirect("/canais");
  }

  const contexts = db.channelContexts.filter(
    (c) => c.audienceId === audience.id && c.active,
  );

  return (
    <EditarCanaisClient
      audienceId={audience.id}
      audienceName={audience.name}
      moments={db.moments
        .filter((m) => m.active)
        .map((m) => ({ value: m.id, label: m.name }))}
      catalogChannels={db.channels
        .filter((c) => c.active)
        .map((c) => ({ value: c.id, label: c.name }))}
      contexts={contexts}
    />
  );
}
