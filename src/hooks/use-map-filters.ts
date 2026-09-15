"use client";

import { useMemo, useState } from "react";
import { applyMapFilters, emptyFilters } from "@/lib/filters";
import type { FeatureMapRow, MapFilters } from "@/types";

export function useMapFilters(
  rows: FeatureMapRow[],
  initial?: Partial<MapFilters>,
) {
  const [filters, setFilters] = useState<MapFilters>({
    ...emptyFilters,
    ...initial,
  });

  const filteredRows = useMemo(
    () => applyMapFilters(rows, filters),
    [rows, filters],
  );

  function updateFilter<K extends keyof MapFilters>(
    key: K,
    value: MapFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ ...emptyFilters, ...initial });
  }

  function toggleInArray(
    key: Exclude<keyof MapFilters, "search">,
    value: string,
  ) {
    setFilters((prev) => {
      const current = prev[key] as string[];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  return {
    filters,
    filteredRows,
    setFilters,
    updateFilter,
    clearFilters,
    toggleInArray,
  };
}
