import { MapaClient } from "@/app/mapa/mapa-client";
import { PRODUCT_OPTIONS } from "@/lib/products";
import {
  buildFeatureMapRows,
  getAudiences,
  getChannels,
  getJourneys,
  getMoments,
} from "@/services/channels";
import { getDatabase } from "@/services/db";

export default async function MapaPage() {
  const [rows, audiences, moments, journeys, channels, db] = await Promise.all([
    buildFeatureMapRows(),
    getAudiences(),
    getMoments(),
    getJourneys(),
    getChannels(),
    getDatabase(),
  ]);

  const products = PRODUCT_OPTIONS;
  const responsibles = Array.from(
    new Set(rows.map((r) => r.responsible).filter(Boolean)),
  ).map((responsible) => ({ value: responsible, label: responsible }));

  return (
    <MapaClient
      rows={rows}
      audiences={audiences.map((a) => ({ value: a.id, label: a.name }))}
      moments={moments.map((m) => ({ value: m.id, label: m.name }))}
      journeys={journeys.map((j) => ({
        value: j.id,
        label: j.name,
        momentIds: j.momentIds,
      }))}
      needs={db.userNeeds
        .filter((n) => n.active)
        .map((n) => ({
          value: n.id,
          label: n.name,
          journeyId: n.journeyId,
        }))}
      channels={channels.map((c) => ({ value: c.id, label: c.name }))}
      products={products}
      responsibles={responsibles}
    />
  );
}
