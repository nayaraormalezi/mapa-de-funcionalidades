import Link from "next/link";
import { StatusBadge } from "@/components/badges/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SurfaceCard } from "@/components/ui/prototype";
import { cn } from "@/lib/utils";
import type { FeatureMapRow, FeatureStatus, TemporalStatus } from "@/types";
import { LayoutGrid, MoreHorizontal, Sparkles } from "lucide-react";

type MatrixCell = {
  status: FeatureStatus;
  featureId: string;
};

type MatrixGroup = {
  key: string;
  audienceName: string;
  momentName: string;
  channels: { id: string; name: string; temporal: TemporalStatus }[];
  journeyBlocks: {
    journeyName: string;
    rows: {
      userNeedName: string;
      featureId: string;
      featureName: string;
      isDemo: boolean;
      cells: Record<string, MatrixCell | null>;
    }[];
  }[];
};

const journeyAccent = [
  "border-l-[#145fab]",
  "border-l-[#406c3d]",
  "border-l-[#f39300]",
  "border-l-[#b26f9b]",
  "border-l-[#00b5e5]",
  "border-l-[#ef765e]",
];

function buildMatrixGroups(rows: FeatureMapRow[]): MatrixGroup[] {
  const groupMap = new Map<string, FeatureMapRow[]>();

  for (const row of rows) {
    const key = `${row.audienceId}::${row.momentId}`;
    const list = groupMap.get(key) ?? [];
    list.push(row);
    groupMap.set(key, list);
  }

  return Array.from(groupMap.entries()).map(([key, groupRows]) => {
    const first = groupRows[0];
    const channelMap = new Map<
      string,
      { name: string; temporal: TemporalStatus; order: number }
    >();
    for (const row of groupRows) {
      const existing = channelMap.get(row.channelId);
      if (!existing) {
        channelMap.set(row.channelId, {
          name: row.channelName,
          temporal: row.temporalStatus,
          order: row.temporalStatus === "FUTURE" ? 1 : 0,
        });
      }
    }
    const channels = Array.from(channelMap.entries())
      .map(([id, meta]) => ({
        id,
        name: meta.name,
        temporal: meta.temporal,
        order: meta.order,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "pt-BR"));

    const journeyMap = new Map<string, Map<string, FeatureMapRow[]>>();
    for (const row of groupRows) {
      const byJourney =
        journeyMap.get(row.journeyName) ??
        new Map<string, FeatureMapRow[]>();
      const list = byJourney.get(row.featureId) ?? [];
      list.push(row);
      byJourney.set(row.featureId, list);
      journeyMap.set(row.journeyName, byJourney);
    }

    const journeyBlocks = Array.from(journeyMap.entries()).map(
      ([journeyName, featureMap]) => ({
        journeyName,
        rows: Array.from(featureMap.values()).map((featureRows) => {
          const base = featureRows[0];
          const cells: Record<string, MatrixCell | null> = {};
          for (const channel of channels) {
            const match = featureRows.find((r) => r.channelId === channel.id);
            cells[channel.id] = match
              ? { status: match.status, featureId: match.featureId }
              : null;
          }
          return {
            userNeedName: base.userNeedName,
            featureId: base.featureId,
            featureName: base.featureName,
            isDemo: base.isDemo,
            cells,
          };
        }),
      }),
    );

    return {
      key,
      audienceName: first.audienceName,
      momentName: first.momentName,
      channels,
      journeyBlocks,
    };
  });
}

function ChannelHeader({
  name,
  temporal,
}: {
  name: string;
  temporal: TemporalStatus;
}) {
  if (temporal !== "FUTURE") {
    return <span className="uppercase">{name}</span>;
  }
  return (
    <span className="inline-flex flex-col items-start gap-0.5 text-[var(--accent)] uppercase">
      <span className="inline-flex items-center gap-1">
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
        {name}
      </span>
      <span className="font-semibold">(EM BREVE)</span>
    </span>
  );
}

export function FeatureMatrix({ rows }: { rows: FeatureMapRow[] }) {
  const groups = buildMatrixGroups(rows);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhuma combinação para a matriz"
        description="Ajuste os filtros para visualizar a cobertura por canal."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <SurfaceCard key={group.key} className="overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] tracking-wide text-slate-500 uppercase">
                <tr className="border-b border-[var(--border)] bg-slate-50/80">
                  <th
                    rowSpan={2}
                    className="min-w-[120px] border-b border-[var(--border)] px-3 py-3 align-bottom font-semibold"
                  >
                    Jornada
                  </th>
                  <th
                    rowSpan={2}
                    className="min-w-[180px] border-b border-[var(--border)] px-3 py-3 align-bottom font-semibold"
                  >
                    Necessidade do usuário
                  </th>
                  <th
                    rowSpan={2}
                    className="min-w-[160px] border-b border-[var(--border)] px-3 py-3 align-bottom font-semibold"
                  >
                    Funcionalidade
                  </th>
                  {group.channels.length > 0 ? (
                    <th
                      colSpan={group.channels.length}
                      className="border-b border-[var(--border)] px-3 py-2 text-center font-semibold text-slate-600"
                    >
                      Canais – {group.audienceName} ({group.momentName})
                    </th>
                  ) : null}
                  <th
                    rowSpan={2}
                    className="w-10 border-b border-[var(--border)] px-2 py-3"
                  />
                </tr>
                <tr className="border-b border-[var(--border)] bg-slate-50/50">
                  {group.channels.map((channel) => (
                    <th
                      key={channel.id}
                      className={cn(
                        "min-w-[130px] px-3 py-2.5 font-semibold",
                        channel.temporal === "FUTURE" &&
                          "bg-[var(--accent-soft)]/40 text-[var(--accent)]",
                      )}
                    >
                      <ChannelHeader
                        name={channel.name}
                        temporal={channel.temporal}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.journeyBlocks.map((block, bi) =>
                  block.rows.map((row, ri) => (
                    <tr
                      key={`${block.journeyName}-${row.featureId}`}
                      className="border-t border-[var(--border)] hover:bg-slate-50/80"
                    >
                      {ri === 0 ? (
                        <td
                          rowSpan={block.rows.length}
                          className={cn(
                            "border-l-4 bg-slate-50/60 px-3 py-3 align-top text-sm font-semibold text-slate-800",
                            journeyAccent[bi % journeyAccent.length],
                          )}
                        >
                          {block.journeyName}
                          <span className="mt-0.5 block text-[11px] font-medium text-slate-400 normal-case">
                            ({block.rows.length}{" "}
                            {block.rows.length === 1
                              ? "funcionalidade"
                              : "funcionalidades"}
                            )
                          </span>
                        </td>
                      ) : null}
                      <td className="max-w-[220px] px-3 py-3 text-xs text-slate-600">
                        {row.userNeedName}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/funcionalidades/${row.featureId}`}
                          className="text-sm font-medium text-[var(--brand)] hover:underline"
                        >
                          {row.featureName}
                        </Link>
                      </td>
                      {group.channels.map((channel) => {
                        const cell = row.cells[channel.id];
                        return (
                          <td
                            key={channel.id}
                            className={cn(
                              "px-3 py-3",
                              channel.temporal === "FUTURE" &&
                                "bg-[var(--accent-soft)]/40",
                            )}
                          >
                            {cell ? (
                              <StatusBadge status={cell.status} />
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}
