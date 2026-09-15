import { GapsClient } from "@/app/gaps/gaps-client";
import { getAudiences, getJourneys, getMoments } from "@/services/channels";
import { getGaps } from "@/services/gaps";
import { getGapIntelligence } from "@/services/intelligence";

export default async function GapsPage() {
  const [gaps, audiences, moments, journeys, intel] = await Promise.all([
    getGaps(),
    getAudiences(),
    getMoments(),
    getJourneys(),
    getGapIntelligence(),
  ]);

  const journeyNameById = Object.fromEntries(
    journeys.map((j) => [j.id, j.name]),
  );

  return (
    <GapsClient
      gaps={gaps}
      audiences={audiences.map((a) => ({ id: a.id, name: a.name }))}
      moments={moments.map((m) => ({ id: m.id, name: m.name }))}
      journeyNameById={journeyNameById}
      summary={{
        totalOpen: intel.totalOpen,
        byType: intel.byType,
        byImpact: intel.byImpact,
        transitionCount: intel.transitionGaps.length,
        criticalCount: intel.criticalGaps.length,
      }}
    />
  );
}
