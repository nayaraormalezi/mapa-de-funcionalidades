"use client";

import { useState, type ReactNode } from "react";
import {
  FilterSelect,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const tabs = [
  { id: "overview", label: "Visão geral" },
  { id: "coverage", label: "Cobertura por canal" },
  { id: "evolution", label: "Evolução no tempo" },
  { id: "gaps", label: "Gaps e oportunidades" },
  { id: "experience", label: "Experiência do usuário" },
  { id: "roadmap", label: "Entrega e roadmap" },
] as const;

export type RelatorioTabId = (typeof tabs)[number]["id"];

export function RelatoriosTabs({
  periodOptions,
  children,
}: {
  periodOptions: { value: string; label: string }[];
  children: Partial<Record<RelatorioTabId, ReactNode>> & {
    overview: ReactNode;
    coverage: ReactNode;
    gaps: ReactNode;
    experience: ReactNode;
  };
}) {
  const [tab, setTab] = useState<RelatorioTabId>("overview");
  const [period, setPeriod] = useState(periodOptions[0]?.value ?? "90d");

  const content =
    children[tab] ??
    (tab === "evolution" || tab === "roadmap"
      ? children.overview
      : children.overview);

  return (
    <div className="space-y-4">
      <SurfaceCard className="flex flex-wrap items-end justify-between gap-3 p-4">
        <FilterSelect
          label="Período"
          value={period}
          onChange={setPeriod}
          options={periodOptions}
          className="w-52"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar relatório
        </Button>
      </SurfaceCard>

      <UnderlineTabs
        value={tab}
        onChange={(id) => setTab(id as RelatorioTabId)}
        options={tabs.map((t) => ({ id: t.id, label: t.label }))}
      />

      {content}
    </div>
  );
}
