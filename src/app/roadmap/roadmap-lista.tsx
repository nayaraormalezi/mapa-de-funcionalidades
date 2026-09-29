"use client";

import { Fragment, useState } from "react";
import { StageBadge } from "@/components/badges/stage-badge";
import { SurfaceCard } from "@/components/ui/prototype";
import { evolutionPhaseLabel, temporalStatusLabel } from "@/lib/labels";
import {
  activeEvolutions,
  groupByFeature,
  type FeatureEvolution,
  type RoadmapImpl,
} from "@/app/roadmap/roadmap-types";

export function RoadmapListaView({
  items,
  onOpenFeature,
  onOpenEvolution,
}: {
  items: RoadmapImpl[];
  onOpenFeature: (featureId: string, implId?: string) => void;
  onOpenEvolution: (item: RoadmapImpl, evo: FeatureEvolution) => void;
}) {
  const groups = groupByFeature(items);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (groups.length === 0) {
    return (
      <SurfaceCard className="p-6 text-sm text-[var(--muted-foreground)]">
        Nenhum item com os filtros atuais.
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="overflow-x-auto p-0">
      <p className="border-b border-[var(--border)] bg-slate-50/60 px-4 py-2 text-[11px] text-[var(--muted-foreground)]">
        Cada linha é uma implementação; agrupadas por funcionalidade.
      </p>
      <table className="min-w-[1200px] w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
          <tr>
            <th className="px-4 py-3">Funcionalidade</th>
            <th className="px-4 py-3">Produto</th>
            <th className="px-4 py-3">Necessidade</th>
            <th className="px-4 py-3">Público</th>
            <th className="px-4 py-3">Momento</th>
            <th className="px-4 py-3">Jornada</th>
            <th className="px-4 py-3">Canal</th>
            <th className="px-4 py-3">Situação</th>
            <th className="px-4 py-3">Fase</th>
            <th className="px-4 py-3">Evoluções</th>
            <th className="px-4 py-3">Responsável</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <FeatureGroup
              key={group.featureId}
              group={group}
              expanded={expanded}
              setExpanded={setExpanded}
              onOpenFeature={onOpenFeature}
              onOpenEvolution={onOpenEvolution}
            />
          ))}
        </tbody>
      </table>
    </SurfaceCard>
  );
}

function FeatureGroup({
  group,
  expanded,
  setExpanded,
  onOpenFeature,
  onOpenEvolution,
}: {
  group: {
    featureId: string;
    featureName: string;
    productCount: number;
    items: RoadmapImpl[];
  };
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onOpenFeature: (featureId: string, implId?: string) => void;
  onOpenEvolution: (item: RoadmapImpl, evo: FeatureEvolution) => void;
}) {
  return (
    <>
      <tr className="border-t border-[var(--border)] bg-slate-50/80">
        <td colSpan={11} className="px-4 py-2.5">
          <button
            type="button"
            onClick={() => onOpenFeature(group.featureId)}
            className="text-left"
          >
            <span className="text-sm font-semibold tracking-tight text-[var(--brand)] uppercase">
              {group.featureName}
            </span>
            <span className="ml-2 text-[11px] font-normal normal-case text-slate-500">
              {group.productCount}{" "}
              {group.productCount === 1 ? "produto" : "produtos"} ·{" "}
              {group.items.length}{" "}
              {group.items.length === 1 ? "implementação" : "implementações"}
            </span>
          </button>
        </td>
      </tr>
      {group.items.map((item, index) => {
        const isLast = index === group.items.length - 1;
        const prefix = isLast ? "└─" : "├─";
        const active = activeEvolutions(item);
        const isOpen = expanded[item.id];
        return (
          <Fragment key={item.id}>
            <tr className="border-t border-slate-100 hover:bg-slate-50">
              <td
                className="cursor-pointer px-4 py-2.5 text-xs text-slate-600"
                onClick={() => onOpenFeature(item.featureId, item.id)}
              >
                <span className="mr-1.5 text-slate-300">{prefix}</span>
                {item.featureName}
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                  {item.productShortName}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-700">
                {item.userNeedName || "—"}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-700">
                {item.audienceName}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-700">
                {item.momentName}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-700">
                {item.journeyName}
              </td>
              <td className="px-4 py-2.5 text-xs font-medium text-slate-900">
                {item.channelName}
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {temporalStatusLabel[item.temporalStatus]}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className="inline-flex items-center gap-1">
                  <span className="text-slate-400">●</span>
                  <StageBadge stage={item.phase} />
                </span>
              </td>
              <td className="px-4 py-2.5">
                {active.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className="text-left text-[11px] font-semibold text-amber-700 hover:underline"
                  >
                    ✦ {active.length} em andamento {isOpen ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600">
                {item.responsible || "—"}
              </td>
            </tr>
            {isOpen
              ? active.map((evo) => (
                  <tr
                    key={evo.id}
                    className="border-t border-amber-50 bg-amber-50/30"
                  >
                    <td
                      colSpan={6}
                      className="cursor-pointer px-4 py-2.5 pl-10 text-xs text-amber-900"
                      onClick={() => onOpenEvolution(item, evo)}
                    >
                      ✦ Evolução: {evo.title}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {item.channelName}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {item.productShortName}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-amber-800">
                      {evolutionPhaseLabel(evo.phase)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenEvolution(item, evo)}
                        className="text-[11px] font-medium text-[var(--brand)] hover:underline"
                      >
                        Mostrar →
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {evo.responsible || "—"}
                    </td>
                  </tr>
                ))
              : null}
          </Fragment>
        );
      })}
    </>
  );
}
