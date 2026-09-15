import { JornadasCatalogClient } from "@/app/cadastros/jornadas/jornadas-catalog-client";
import { getAuthState } from "@/lib/auth";
import { getDatabase } from "@/services/db";

export default async function JornadasCatalogPage() {
  const [db, { canEdit }] = await Promise.all([
    getDatabase(),
    getAuthState(),
  ]);

  const momentsById = new Map(db.moments.map((m) => [m.id, m.name]));
  const audiences = db.audiences
    .filter((a) => a.active)
    .map((a) => ({ id: a.id, name: a.name, code: a.code }));

  const stages = db.journeyAudienceStages.filter((s) => s.active);

  const catalog = db.journeys
    .filter((j) => j.active)
    .sort((a, b) => a.order - b.order)
    .map((j) => ({
      id: j.id,
      name: j.name,
      description: j.description,
      order: j.order,
      usages: stages
        .filter((s) => s.journeyId === j.id)
        .map((s) => ({
          audienceId: s.audienceId,
          displayName: s.displayName,
          sortOrder: s.sortOrder,
          momentId: s.momentId,
          momentName: momentsById.get(s.momentId) ?? s.momentId,
        }))
        .sort((a, b) => {
          const ai = audiences.findIndex((x) => x.id === a.audienceId);
          const bi = audiences.findIndex((x) => x.id === b.audienceId);
          return ai - bi || a.sortOrder - b.sortOrder;
        }),
    }));

  return (
    <JornadasCatalogClient
      audiences={audiences}
      catalog={catalog}
      canEdit={canEdit}
    />
  );
}
