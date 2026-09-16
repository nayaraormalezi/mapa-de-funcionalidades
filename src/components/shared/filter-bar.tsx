"use client";

import { Button } from "@/components/ui/button";
import {
  featureStageOptions,
  featureStatusOptions,
  experienceLabel,
  priorityLabel,
  temporalStatusLabel,
} from "@/lib/labels";
import { countActiveFilters } from "@/lib/filters";
import { cn } from "@/lib/utils";
import type { MapFilters } from "@/types";
import { X } from "lucide-react";

type Option = { value: string; label: string };

function MultiSelectChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs ring-1 transition-colors",
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] ring-[var(--primary)]"
                  : "bg-[var(--surface)] text-[var(--foreground)] ring-[var(--border)] hover:bg-[var(--muted)]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterBar({
  filters,
  onToggle,
  onClear,
  audiences,
  moments,
  journeys,
  channels,
  products,
  responsibles,
}: {
  filters: MapFilters;
  onToggle: (key: Exclude<keyof MapFilters, "search">, value: string) => void;
  onClear: () => void;
  audiences: Option[];
  moments: Option[];
  journeys: Option[];
  channels: Option[];
  products: Option[];
  responsibles: Option[];
}) {
  const activeCount = countActiveFilters(filters);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold">
            Filtros avançados
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            {activeCount === 0
              ? "Nenhum filtro ativo"
              : `${activeCount} grupo(s) de filtro ativo(s)`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={activeCount === 0}
        >
          <X className="h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MultiSelectChips
          label="Público"
          options={audiences}
          selected={filters.audienceIds}
          onToggle={(v) => onToggle("audienceIds", v)}
        />
        <MultiSelectChips
          label="Momento"
          options={moments}
          selected={filters.momentIds}
          onToggle={(v) => onToggle("momentIds", v)}
        />
        <MultiSelectChips
          label="Jornada"
          options={journeys}
          selected={filters.journeyIds}
          onToggle={(v) => onToggle("journeyIds", v)}
        />
        <MultiSelectChips
          label="Canal"
          options={channels}
          selected={filters.channelIds}
          onToggle={(v) => onToggle("channelIds", v)}
        />
        <MultiSelectChips
          label="Situação do canal"
          options={(Object.keys(temporalStatusLabel) as Array<keyof typeof temporalStatusLabel>).map(
            (key) => ({ value: key, label: temporalStatusLabel[key] }),
          )}
          selected={filters.temporalStatuses}
          onToggle={(v) => onToggle("temporalStatuses", v)}
        />
        <MultiSelectChips
          label="Status"
          options={featureStatusOptions()}
          selected={filters.statuses}
          onToggle={(v) => onToggle("statuses", v)}
        />
        <MultiSelectChips
          label="Etapa"
          options={featureStageOptions()}
          selected={filters.phases}
          onToggle={(v) => onToggle("phases", v)}
        />
        <MultiSelectChips
          label="Experiência"
          options={(Object.keys(experienceLabel) as Array<keyof typeof experienceLabel>).map(
            (key) => ({ value: key, label: experienceLabel[key] }),
          )}
          selected={filters.experiences}
          onToggle={(v) => onToggle("experiences", v)}
        />
        <MultiSelectChips
          label="Produto"
          options={products}
          selected={filters.products}
          onToggle={(v) => onToggle("products", v)}
        />
        <MultiSelectChips
          label="Prioridade"
          options={(Object.keys(priorityLabel) as Array<keyof typeof priorityLabel>).map(
            (key) => ({ value: key, label: priorityLabel[key] }),
          )}
          selected={filters.priorities}
          onToggle={(v) => onToggle("priorities", v)}
        />
        <MultiSelectChips
          label="Responsável"
          options={responsibles}
          selected={filters.responsibles}
          onToggle={(v) => onToggle("responsibles", v)}
        />
      </div>
    </div>
  );
}
