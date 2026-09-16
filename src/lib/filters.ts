import type { FeatureMapRow, MapFilters } from "@/types";

export const emptyFilters: MapFilters = {
  search: "",
  audienceIds: [],
  momentIds: [],
  journeyIds: [],
  userNeedIds: [],
  featureIds: [],
  channelIds: [],
  temporalStatuses: [],
  statuses: [],
  experiences: [],
  productIds: [],
  products: [],
  priorities: [],
  responsibles: [],
  phases: [],
};

function matchesMulti(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value);
}

export function applyMapFilters(
  rows: FeatureMapRow[],
  filters: MapFilters,
): FeatureMapRow[] {
  const query = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (query) {
      const haystack = [
        row.featureName,
        row.featureDescription,
        row.userNeedName,
        row.journeyName,
        row.channelName,
        row.audienceName,
        row.momentName,
        row.product,
        row.productShortName,
        row.owner,
        row.capabilityName,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return (
      matchesMulti(filters.audienceIds, row.audienceId) &&
      matchesMulti(filters.momentIds, row.momentId) &&
      matchesMulti(filters.journeyIds, row.journeyId) &&
      matchesMulti(filters.userNeedIds, row.userNeedId) &&
      matchesMulti(filters.featureIds, row.featureId) &&
      matchesMulti(filters.channelIds, row.channelId) &&
      matchesMulti(filters.temporalStatuses, row.temporalStatus) &&
      matchesMulti(filters.statuses, row.status) &&
      matchesMulti(filters.experiences, row.experience) &&
      matchesMulti(filters.productIds, row.productId) &&
      matchesMulti(filters.products, row.product) &&
      matchesMulti(filters.priorities, row.priority) &&
      matchesMulti(filters.responsibles, row.responsible) &&
      matchesMulti(filters.phases, row.phase)
    );
  });
}

export function countActiveFilters(filters: MapFilters): number {
  let count = filters.search.trim() ? 1 : 0;
  const arrays: (keyof MapFilters)[] = [
    "audienceIds",
    "momentIds",
    "journeyIds",
    "userNeedIds",
    "featureIds",
    "channelIds",
    "temporalStatuses",
    "statuses",
    "experiences",
    "productIds",
    "products",
    "priorities",
    "responsibles",
    "phases",
  ];
  for (const key of arrays) {
    const value = filters[key];
    if (Array.isArray(value) && value.length > 0) count += 1;
  }
  return count;
}
