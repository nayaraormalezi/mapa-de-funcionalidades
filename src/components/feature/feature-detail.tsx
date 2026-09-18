import { GapCard } from "@/components/gaps/gap-card";
import { EvidenceList } from "@/components/feature/evidence-list";
import {
  RoadmapTimeline,
  type ImplementationTimelineItem,
} from "@/components/feature/roadmap-timeline";
import { AudienceBadge } from "@/components/badges/audience-badge";
import { ChannelBadge } from "@/components/badges/channel-badge";
import { HealthBadge } from "@/components/badges/health-badge";
import { MomentBadge } from "@/components/badges/moment-badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CONCEPT_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type {
  Evidence,
  Feature,
  FeatureMapRow,
  Gap,
  Journey,
  UserNeed,
  Capability,
} from "@/types";

export function FeatureDetail({
  feature,
  hierarchy,
  contexts,
  evidences,
  roadmap,
  gaps,
}: {
  feature: Feature;
  hierarchy: {
    journey?: Journey;
    userNeed?: UserNeed;
    capability?: Capability;
  };
  contexts: FeatureMapRow[];
  evidences: Evidence[];
  /** Timeline derivada de Implementations (não RoadmapItem). */
  roadmap: ImplementationTimelineItem[];
  gaps: Gap[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            {feature.isDemo ? (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 ring-1 ring-amber-200 uppercase">
                Dado DEMO
              </span>
            ) : null}
            <PriorityBadge priority={feature.priority} />
          </div>
          <CardTitle className="text-2xl">{feature.name}</CardTitle>
          <CardDescription>{feature.description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Produto" value={feature.product || "—"} />
          <Meta label="Owner" value={feature.owner} />
          <Meta label="UX Owner" value={feature.uxOwner} />
          <Meta label="CX Owner" value={feature.cxOwner} />
          <Meta label="Product Owner" value={feature.productOwner} />
          <Meta label="Criado em" value={formatDate(feature.createdAt)} />
          <Meta
            label="Última atualização"
            value={formatDate(feature.updatedAt)}
          />
          <Meta
            label="Jornada"
            value={hierarchy.journey?.name ?? "—"}
          />
          <Meta
            label="Necessidade"
            value={hierarchy.userNeed?.name ?? "—"}
          />
          <Meta
            label="Capacidade"
            value={hierarchy.capability?.name ?? "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status por contexto</CardTitle>
          <CardDescription>
            A mesma funcionalidade pode ter status diferente por público,
            momento e canal.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--muted)] text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
              <tr>
                <th className="px-3 py-2">Público</th>
                <th className="px-3 py-2">Momento</th>
                <th className="px-3 py-2">Canal</th>
                <th className="px-3 py-2">Situação</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Experiência</th>
                <th className="px-3 py-2">Previsão</th>
              </tr>
            </thead>
            <tbody>
              {contexts.map((ctx) => (
                <tr
                  key={ctx.featureChannelContextId}
                  className="border-t border-[var(--border)]"
                >
                  <td className="px-3 py-3">
                    <AudienceBadge
                      code={ctx.audienceCode}
                      name={ctx.audienceName}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <MomentBadge code={ctx.momentCode} name={ctx.momentName} />
                  </td>
                  <td className="px-3 py-3">
                    <ChannelBadge name={ctx.channelName} />
                  </td>
                  <td className="px-3 py-3">
                    <ChannelBadge
                      name={
                        ctx.temporalStatus === "CURRENT"
                          ? "Atual"
                          : ctx.temporalStatus === "FUTURE"
                            ? "Futuro"
                            : "Depreciado"
                      }
                      temporalStatus={ctx.temporalStatus}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={ctx.status} />
                  </td>
                  <td className="px-3 py-3">
                    <HealthBadge
                      score={ctx.healthScore}
                      signal={ctx.healthSignal}
                    />
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {formatDate(ctx.expectedDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <RoadmapTimeline items={roadmap} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Evidências</CardTitle>
          </CardHeader>
          <CardContent>
            <EvidenceList evidences={evidences} />
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
          {CONCEPT_LABEL.issues} relacionadas
        </h2>
        {gaps.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nenhuma {CONCEPT_LABEL.issue.toLowerCase()} associada a esta funcionalidade.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {gaps.map((gap) => (
              <GapCard key={gap.id} gap={gap} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
