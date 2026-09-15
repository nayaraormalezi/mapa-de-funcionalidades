import { MapaClient } from "@/app/mapa/mapa-client";
import {
  buildFeatureMapRows,
  getAudiences,
  getChannels,
  getJourneys,
  getMoments,
} from "@/services/channels";

export default async function MapaPage() {
  const [rows, audiences, moments, journeys, channels] = await Promise.all([
    buildFeatureMapRows(),
    getAudiences(),
    getMoments(),
    getJourneys(),
    getChannels(),
  ]);

  const products = Array.from(new Set(rows.map((r) => r.product))).map(
    (product) => ({ value: product, label: product }),
  );
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
      channels={channels.map((c) => ({ value: c.id, label: c.name }))}
      products={products}
      responsibles={responsibles}
    />
  );
}
