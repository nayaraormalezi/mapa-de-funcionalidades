import { Suspense } from "react";
import { GapsClient, type HubTab } from "@/app/gaps/gaps-client";
import { PRODUCT_CATALOG } from "@/lib/products";
import {
  getAudiences,
  getJourneys,
  getMoments,
} from "@/services/channels";
import { getHubSignals } from "@/services/gaps-opportunities";

function parseTab(raw: string | undefined): HubTab {
  if (raw === "oportunidades" || raw === "opportunities") return "opportunities";
  if (raw === "problemas" || raw === "issues") return "issues";
  if (raw === "lacunas" || raw === "gaps") return "gaps";
  return "gaps";
}

export default async function GapsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [hub, audiences, moments, journeys] = await Promise.all([
    getHubSignals(),
    getAudiences(),
    getMoments(),
    getJourneys(),
  ]);

  const products = PRODUCT_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-[var(--muted-foreground)]">
          Carregando melhorias…
        </div>
      }
    >
      <GapsClient
        coverageGaps={hub.coverageGaps}
        opportunities={hub.opportunities}
        issues={hub.issues}
        audiences={audiences.map((a) => ({ id: a.id, name: a.name }))}
        moments={moments.map((m) => ({ id: m.id, name: m.name }))}
        journeys={journeys.map((j) => ({ id: j.id, name: j.name }))}
        products={products}
        initialTab={parseTab(tab)}
      />
    </Suspense>
  );
}
