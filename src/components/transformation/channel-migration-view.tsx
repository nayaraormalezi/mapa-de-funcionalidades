import Link from "next/link";
import { ChannelBadge } from "@/components/badges/channel-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TransformationSummary } from "@/types";
import { ArrowDown } from "lucide-react";

function FeatureChipList({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: TransformationSummary["migrate"];
  emptyLabel: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((row) => (
            <li
              key={`${title}-${row.featureId}-${row.channelId}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
            >
              <Link
                href={`/funcionalidades/${row.featureId}`}
                className="text-sm font-medium text-[var(--brand)] hover:underline"
              >
                {row.featureName}
              </Link>
              <StatusBadge status={row.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChannelMigrationView({
  summary,
  audienceScoped = false,
}: {
  summary: TransformationSummary;
  audienceScoped?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {audienceScoped
            ? summary.momentName
            : `${summary.audienceName} — ${summary.momentName}`}
        </CardTitle>
        <CardDescription>
          Visão de transformação Atual → Futuro
          {audienceScoped ? ` · ${summary.audienceName}` : " para governança de canais"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
              Atual
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.currentChannels.length === 0 ? (
                <span className="text-sm text-[var(--muted-foreground)]">
                  Sem canais atuais
                </span>
              ) : (
                summary.currentChannels.map((channel) => (
                  <ChannelBadge
                    key={channel.id}
                    name={channel.name}
                    temporalStatus="CURRENT"
                  />
                ))
              )}
            </div>
          </div>
          <div className="flex justify-center">
            <ArrowDown className="h-5 w-5 text-[var(--muted-foreground)] md:rotate-[-90deg]" />
          </div>
          <div className="rounded-xl border border-dashed border-cyan-300 bg-cyan-50/50 p-4">
            <p className="text-xs font-semibold tracking-wide text-cyan-900 uppercase">
              Futuro
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.futureChannels.length === 0 ? (
                <span className="text-sm text-[var(--muted-foreground)]">
                  Sem canal futuro definido
                </span>
              ) : (
                summary.futureChannels.map((channel) => (
                  <ChannelBadge
                    key={channel.id}
                    name={channel.name}
                    temporalStatus="FUTURE"
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FeatureChipList
            title="Permanecem"
            rows={summary.remain}
            emptyLabel="Nenhuma funcionalidade apenas no atual."
          />
          <FeatureChipList
            title="Serão migradas"
            rows={summary.migrate}
            emptyLabel="Nenhuma migração mapeada."
          />
          <FeatureChipList
            title="Serão criadas"
            rows={summary.create}
            emptyLabel="Nenhuma funcionalidade nova no futuro."
          />
          <FeatureChipList
            title="Serão descontinuadas"
            rows={summary.discontinue}
            emptyLabel="Nenhuma descontinuação registrada."
          />
          <FeatureChipList
            title="Sem definição no futuro"
            rows={summary.undefined}
            emptyLabel="Todas as funcionalidades atuais possuem destino."
          />
        </div>
      </CardContent>
    </Card>
  );
}
