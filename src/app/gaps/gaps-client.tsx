"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { upsertGap } from "@/app/actions/crud";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/components/auth/auth-provider";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { Button } from "@/components/ui/button";
import {
  FilterSelect,
  PageHeader,
  SectionTitle,
  StatCard,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { SIGNAL_LABEL } from "@/lib/evaluation-governance";
import { evaluationAreaLabel } from "@/lib/evaluation-taxonomy";
import {
  CONCEPT_LABEL,
  featureStageLabel,
  gapStatusLabel,
  gapTypeLabel,
  priorityLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  HubCoverageGap,
  HubIssue,
  HubOpportunity,
} from "@/services/gaps-opportunities";
import { AlertTriangle, Lightbulb, ShieldAlert } from "lucide-react";

export type HubTab = "gaps" | "opportunities" | "issues";

const TAB_IDS: HubTab[] = ["gaps", "opportunities", "issues"];

function parseTab(raw: string | null): HubTab {
  if (raw === "oportunidades") return "opportunities";
  if (raw && TAB_IDS.includes(raw as HubTab)) return raw as HubTab;
  return "gaps";
}

export function GapsClient({
  coverageGaps,
  opportunities,
  issues,
  audiences,
  moments,
  journeys,
  products,
  initialTab = "gaps",
}: {
  coverageGaps: HubCoverageGap[];
  opportunities: HubOpportunity[];
  issues: HubIssue[];
  audiences: { id: string; name: string }[];
  moments: { id: string; name: string }[];
  journeys: { id: string; name: string }[];
  products: { id: string; name: string }[];
  initialTab?: HubTab;
}) {
  const { canEdit } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const mainTab = parseTab(searchParams.get("tab") ?? initialTab);

  function setMainTab(id: HubTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", id);
    router.replace(`/gaps?${params.toString()}`, { scroll: false });
  }

  // —— Gaps filters ——
  const [gapAudienceId, setGapAudienceId] = useState("");
  const [gapMomentId, setGapMomentId] = useState("");
  const [gapReason, setGapReason] = useState("");
  const [gapProductId, setGapProductId] = useState("");
  const [gapSearch, setGapSearch] = useState("");

  // —— Opportunity filters ——
  const [oppSeverity, setOppSeverity] = useState("");
  const [oppArea, setOppArea] = useState("");
  const [oppProductId, setOppProductId] = useState("");
  const [oppAudienceId, setOppAudienceId] = useState("");
  const [oppChannel, setOppChannel] = useState("");

  // —— Issue filters ——
  const [issueStatus, setIssueStatus] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueImpact, setIssueImpact] = useState("");
  const [issueAudienceId, setIssueAudienceId] = useState("");
  const [issueJourneyId, setIssueJourneyId] = useState("");

  const channelOptions = useMemo(() => {
    const names = new Set(opportunities.map((o) => o.channelName).filter(Boolean));
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((name) => ({ value: name, label: name }));
  }, [opportunities]);

  const areaOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const op of opportunities) {
      for (const a of op.areas) codes.add(a);
    }
    return Array.from(codes)
      .sort()
      .map((code) => ({
        value: code,
        label: evaluationAreaLabel(code),
      }));
  }, [opportunities]);

  const filteredGaps = useMemo(() => {
    const q = gapSearch.trim().toLowerCase();
    return coverageGaps.filter((gap) => {
      if (gapAudienceId && gap.audienceId !== gapAudienceId) return false;
      if (gapMomentId && gap.momentId !== gapMomentId) return false;
      if (gapReason && gap.reason !== gapReason) return false;
      if (gapProductId && gap.productId !== gapProductId) return false;
      if (q) {
        const hay = [
          gap.featureName,
          gap.channelName,
          gap.title,
          gap.audienceName,
          gap.momentName,
          gap.productShortName,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    coverageGaps,
    gapAudienceId,
    gapMomentId,
    gapReason,
    gapProductId,
    gapSearch,
  ]);

  const filteredOpps = useMemo(() => {
    return opportunities.filter((op) => {
      if (oppSeverity && op.severity !== oppSeverity) return false;
      if (oppArea && !op.areas.includes(oppArea as (typeof op.areas)[number]))
        return false;
      if (oppProductId && op.productId !== oppProductId) return false;
      if (oppAudienceId && op.audienceId !== oppAudienceId) return false;
      if (oppChannel && op.channelName !== oppChannel) return false;
      return true;
    });
  }, [
    opportunities,
    oppSeverity,
    oppArea,
    oppProductId,
    oppAudienceId,
    oppChannel,
  ]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (issueStatus && issue.status !== issueStatus) return false;
      if (issueType && issue.type !== issueType) return false;
      if (issueImpact && issue.impact !== issueImpact) return false;
      if (issueAudienceId && issue.audienceId !== issueAudienceId) return false;
      if (issueJourneyId && issue.journeyId !== issueJourneyId) return false;
      return true;
    });
  }, [
    issues,
    issueStatus,
    issueType,
    issueImpact,
    issueAudienceId,
    issueJourneyId,
  ]);

  const gapsByFeature = useMemo(() => {
    const map = new Map<
      string,
      {
        featureId: string;
        featureName: string;
        href: string;
        channels: {
          name: string;
          reason: HubCoverageGap["reason"];
          phase: string;
          expectedDate: string | null;
          context: string;
          fccId: string;
        }[];
      }
    >();

    for (const gap of filteredGaps) {
      const existing = map.get(gap.featureId);
      const channelEntry = {
        name: gap.channelName,
        reason: gap.reason,
        phase: gap.phase,
        expectedDate: gap.expectedDate,
        context: `${gap.audienceName} · ${gap.momentName}`,
        fccId: gap.fccId,
      };
      if (existing) {
        if (
          !existing.channels.some(
            (c) =>
              c.name === gap.channelName &&
              c.context === channelEntry.context &&
              c.reason === gap.reason,
          )
        ) {
          existing.channels.push(channelEntry);
        }
        continue;
      }
      map.set(gap.featureId, {
        featureId: gap.featureId,
        featureName: gap.featureName,
        href: gap.href,
        channels: [channelEntry],
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.featureName.localeCompare(b.featureName, "pt-BR"),
    );
  }, [filteredGaps]);

  const filteredBacklogGaps = filteredGaps.filter(
    (g) => g.reason === "BACKLOG",
  ).length;
  const filteredUnplannedGaps = filteredGaps.filter(
    (g) => g.reason === "NOT_PLANNED",
  ).length;
  const filteredCriticalOpps = filteredOpps.filter(
    (o) => o.severity === "CRITICAL",
  ).length;
  const filteredOpenIssues = filteredIssues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
  ).length;
  const filteredCriticalIssues = filteredIssues.filter(
    (i) => i.priority === "CRITICAL" || i.impact === "CRITICAL",
  ).length;

  const openIssuesTotal = issues.filter(
    (i) => i.status === "OPEN" || i.status === "IN_PROGRESS",
  ).length;

  function clearGapFilters() {
    setGapAudienceId("");
    setGapMomentId("");
    setGapReason("");
    setGapProductId("");
    setGapSearch("");
  }

  function clearOppFilters() {
    setOppSeverity("");
    setOppArea("");
    setOppProductId("");
    setOppAudienceId("");
    setOppChannel("");
  }

  function clearIssueFilters() {
    setIssueStatus("");
    setIssueType("");
    setIssueImpact("");
    setIssueAudienceId("");
    setIssueJourneyId("");
  }

  function resolveIssue(issue: HubIssue) {
    if (!canEdit) return;
    if (!confirm(`Marcar a issue "${issue.title}" como resolvida?`)) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", issue.id);
      fd.set("title", issue.title);
      fd.set("description", issue.description);
      fd.set("type", issue.type);
      fd.set("audience_id", issue.audienceId);
      fd.set("moment_id", issue.momentId);
      fd.set("journey_id", issue.journeyId);
      fd.set("user_need_id", issue.userNeedId);
      if (issue.productId) fd.set("product_id", issue.productId);
      if (issue.featureId) fd.set("feature_id", issue.featureId);
      if (issue.currentChannelId)
        fd.set("current_channel_id", issue.currentChannelId);
      if (issue.futureChannelId)
        fd.set("future_channel_id", issue.futureChannelId);
      fd.set("impact", issue.impact);
      fd.set("priority", issue.priority);
      fd.set("responsible", issue.responsible);
      fd.set("status", "RESOLVED");
      fd.set("action_plan", issue.actionPlan);
      fd.set("is_demo", issue.isDemo ? "true" : "false");
      const result = await upsertGap(fd);
      if (result.ok) router.refresh();
      else alert(result.message);
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: CONCEPT_LABEL.melhorias }]}
        title={CONCEPT_LABEL.melhorias}
        description={`${CONCEPT_LABEL.lacunas}: o que está faltando. ${CONCEPT_LABEL.problemas}: o que está funcionando mal. ${CONCEPT_LABEL.opportunities}: onde podemos melhorar.`}
      />

      <SurfaceCard className="border-[#e6f0f7] bg-[#f5f9fc] p-4 text-sm text-slate-700">
        <strong>Como ler:</strong>{" "}
        {CONCEPT_LABEL.lacuna} = necessidade sem cobertura adequada no canal.{" "}
        {CONCEPT_LABEL.problema} = experiência existente com fricção ou falha.{" "}
        {CONCEPT_LABEL.opportunity} = possibilidade de melhoria a partir de
        evidências. Ausência de avaliação não gera oportunidade.
      </SurfaceCard>

      <UnderlineTabs
        value={mainTab}
        onChange={(id) => setMainTab(id as HubTab)}
        options={[
          {
            id: "gaps",
            label: CONCEPT_LABEL.lacunas,
            count: coverageGaps.length,
          },
          {
            id: "issues",
            label: CONCEPT_LABEL.problemas,
            count: openIssuesTotal,
          },
          {
            id: "opportunities",
            label: CONCEPT_LABEL.opportunities,
            count: opportunities.length,
          },
        ]}
      />

      {mainTab === "gaps" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={CONCEPT_LABEL.lacunas}
              value={filteredGaps.length}
              tone="warning"
              icon={ShieldAlert}
              trend={`${filteredBacklogGaps} em backlog · ${filteredUnplannedGaps} sem previsão`}
            />
            <StatCard
              label="Em backlog"
              value={filteredBacklogGaps}
              tone="accent"
              trend="No recorte filtrado"
            />
            <StatCard
              label="Sem previsão"
              value={filteredUnplannedGaps}
              tone="danger"
              trend="No recorte filtrado"
            />
          </div>

          <SurfaceCard className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Público"
                value={gapAudienceId}
                onChange={setGapAudienceId}
                options={[
                  { value: "", label: "Todos" },
                  ...audiences.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <FilterSelect
                label="Momento"
                value={gapMomentId}
                onChange={setGapMomentId}
                options={[
                  { value: "", label: "Todos" },
                  ...moments.map((m) => ({ value: m.id, label: m.name })),
                ]}
              />
              <FilterSelect
                label="Motivo"
                value={gapReason}
                onChange={setGapReason}
                options={[
                  { value: "", label: "Todos" },
                  { value: "BACKLOG", label: "Em backlog" },
                  { value: "NOT_PLANNED", label: "Não prevista" },
                ]}
              />
              <FilterSelect
                label="Produto"
                value={gapProductId}
                onChange={setGapProductId}
                options={[
                  { value: "", label: "Todos" },
                  ...products.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Busca
                <input
                  type="search"
                  value={gapSearch}
                  onChange={(e) => setGapSearch(e.target.value)}
                  placeholder="Funcionalidade, canal…"
                  className="h-9 min-w-[180px] rounded-md border border-[var(--border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--brand)]"
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearGapFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </SurfaceCard>

          <p className="text-sm text-[var(--muted-foreground)]">
            Necessidades que ainda não são atendidas ou possuem baixa cobertura
            nos canais. Respondem: o que está faltando?
          </p>

          {filteredGaps.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title={`Nenhuma ${CONCEPT_LABEL.lacuna.toLowerCase()} encontrada.`}
              description="Nenhum canal associado está em backlog ou sem previsão no recorte atual."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <SurfaceCard className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs tracking-wide text-[var(--muted-foreground)] uppercase">
                    <tr>
                      <th className="px-4 py-3">Funcionalidade</th>
                      <th className="px-4 py-3">Canais</th>
                      <th className="px-4 py-3">Contexto</th>
                      <th className="px-4 py-3">Motivo</th>
                      <th className="px-4 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapsByFeature.map((row) => {
                      const contexts = Array.from(
                        new Set(row.channels.map((c) => c.context)),
                      );
                      const hasBacklog = row.channels.some(
                        (c) => c.reason === "BACKLOG",
                      );
                      const hasUnplanned = row.channels.some(
                        (c) => c.reason === "NOT_PLANNED",
                      );
                      return (
                        <tr
                          key={row.featureId}
                          className="border-t border-[var(--border)] hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3 align-top">
                            <Link
                              href={row.href}
                              className="font-medium text-slate-900 hover:text-[var(--brand)]"
                            >
                              {row.featureName}
                            </Link>
                            <p className="mt-0.5 max-w-xs text-xs text-slate-500">
                              {row.channels.length}{" "}
                              {row.channels.length === 1
                                ? "canal"
                                : "canais"}{" "}
                              com lacuna de cobertura
                            </p>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <ul className="space-y-1">
                              {row.channels.map((ch) => (
                                <li
                                  key={`${ch.name}-${ch.context}-${ch.reason}`}
                                  className="text-xs text-slate-700"
                                >
                                  <span className="font-medium">{ch.name}</span>
                                  <span className="text-slate-500">
                                    {" · "}
                                    {featureStageLabel[
                                      ch.phase as keyof typeof featureStageLabel
                                    ] ?? ch.phase}
                                    {ch.expectedDate
                                      ? ` · ${ch.expectedDate.slice(0, 7)}`
                                      : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-4 py-3 align-top text-xs text-slate-600">
                            {contexts.join(" · ")}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              {hasBacklog ? (
                                <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 ring-1 ring-sky-200">
                                  Em backlog
                                </span>
                              ) : null}
                              {hasUnplanned ? (
                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200">
                                  Não prevista
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col gap-1.5">
                              <Button asChild size="sm" variant="outline">
                                <Link href={row.href}>Mostrar funcionalidade</Link>
                              </Button>
                              {canEdit ? (
                                <Button asChild size="sm" variant="ghost">
                                  <Link href={row.href}>Criar evolução</Link>
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
                  {gapsByFeature.length} funcionalidade
                  {gapsByFeature.length === 1 ? "" : "s"}
                  {" · "}
                  {filteredGaps.length} lacuna
                  {filteredGaps.length === 1 ? "" : "s"} de canal
                </p>
              </SurfaceCard>

              <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
                <SurfaceCard className="p-4">
                  <SectionTitle>Por motivo (filtro)</SectionTitle>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex justify-between gap-2">
                      <span>Em backlog</span>
                      <span className="tabular-nums font-medium">
                        {filteredBacklogGaps}
                      </span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span>Não prevista</span>
                      <span className="tabular-nums font-medium">
                        {filteredUnplannedGaps}
                      </span>
                    </li>
                  </ul>
                </SurfaceCard>
              </aside>
            </div>
          )}
        </>
      ) : null}

      {mainTab === "opportunities" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <StatCard
              label={CONCEPT_LABEL.opportunities}
              value={filteredOpps.length}
              tone="info"
              icon={Lightbulb}
              trend={
                filteredCriticalOpps > 0
                  ? `${filteredCriticalOpps} com resultado crítico`
                  : "A partir de notas baixas"
              }
            />
            <StatCard
              label="Notas críticas"
              value={filteredCriticalOpps}
              tone="danger"
              trend="No recorte filtrado"
            />
          </div>

          <SurfaceCard className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Severidade"
                value={oppSeverity}
                onChange={setOppSeverity}
                options={[
                  { value: "", label: "Todas" },
                  { value: "CRITICAL", label: "Crítico" },
                  { value: "ATTENTION", label: "Atenção" },
                ]}
              />
              <FilterSelect
                label="Área"
                value={oppArea}
                onChange={setOppArea}
                options={[{ value: "", label: "Todas" }, ...areaOptions]}
              />
              <FilterSelect
                label="Produto"
                value={oppProductId}
                onChange={setOppProductId}
                options={[
                  { value: "", label: "Todos" },
                  ...products.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <FilterSelect
                label="Público"
                value={oppAudienceId}
                onChange={setOppAudienceId}
                options={[
                  { value: "", label: "Todos" },
                  ...audiences.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <FilterSelect
                label="Canal"
                value={oppChannel}
                onChange={setOppChannel}
                options={[{ value: "", label: "Todos" }, ...channelOptions]}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearOppFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </SurfaceCard>

          <p className="text-sm text-[var(--muted-foreground)]">
            Possibilidades de melhoria identificadas a partir de evidências,
            problemas e necessidades. Respondem: onde podemos melhorar?
          </p>

          {filteredOpps.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title={`Nenhuma ${CONCEPT_LABEL.opportunity.toLowerCase()} encontrada.`}
              description="Não há notas baixas nas avaliações no recorte atual."
            />
          ) : (
            <div className="space-y-3">
              {filteredOpps.map((op) => (
                <SurfaceCard key={`${op.featureId}-${op.id}`} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {op.title}
                        </p>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                            op.severity === "CRITICAL"
                              ? "bg-rose-50 text-rose-800 ring-rose-200"
                              : "bg-amber-50 text-amber-900 ring-amber-200",
                          )}
                        >
                          {SIGNAL_LABEL[op.severity] ?? op.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{op.summary}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        <Link
                          href={op.href}
                          className="font-medium text-[var(--brand)] hover:underline"
                        >
                          {op.featureName}
                        </Link>
                        {" · "}
                        {op.channelName}
                        {op.audienceName ? ` · ${op.audienceName}` : ""}
                        {op.productShortName
                          ? ` · ${op.productShortName}`
                          : ""}
                        {" · "}
                        Áreas:{" "}
                        {op.areas.map((a) => evaluationAreaLabel(a)).join(", ")}
                        {" · "}
                        Origem: {op.origin}
                      </p>
                      {op.evidence.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Evidências: {op.evidence.slice(0, 2).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canEdit ? (
                        <Button asChild size="sm">
                          <Link href={op.href}>Criar evolução</Link>
                        </Button>
                      ) : null}
                      <Button asChild size="sm" variant="outline">
                        <Link href={op.href}>Mostrar funcionalidade</Link>
                      </Button>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </>
      ) : null}

      {mainTab === "issues" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label={CONCEPT_LABEL.issues}
              value={filteredIssues.length}
              tone="warning"
              icon={AlertTriangle}
              trend={`${filteredOpenIssues} abertas no filtro`}
            />
            <StatCard
              label="Abertas / em tratamento"
              value={filteredOpenIssues}
              tone="accent"
              trend="No recorte filtrado"
            />
            <StatCard
              label="Críticas (impacto/prioridade)"
              value={filteredCriticalIssues}
              tone="danger"
              trend="No recorte filtrado"
            />
          </div>

          <SurfaceCard className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <FilterSelect
                label="Status do problema"
                value={issueStatus}
                onChange={setIssueStatus}
                options={[
                  { value: "", label: "Todos" },
                  ...Object.entries(gapStatusLabel).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <FilterSelect
                label="Tipo"
                value={issueType}
                onChange={setIssueType}
                options={[
                  { value: "", label: "Todos" },
                  ...Object.entries(gapTypeLabel).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <FilterSelect
                label="Impacto"
                value={issueImpact}
                onChange={setIssueImpact}
                options={[
                  { value: "", label: "Todos" },
                  ...Object.entries(priorityLabel).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <FilterSelect
                label="Público"
                value={issueAudienceId}
                onChange={setIssueAudienceId}
                options={[
                  { value: "", label: "Todos" },
                  ...audiences.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <FilterSelect
                label="Jornada"
                value={issueJourneyId}
                onChange={setIssueJourneyId}
                options={[
                  { value: "", label: "Todas" },
                  ...journeys.map((j) => ({ value: j.id, label: j.name })),
                ]}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={clearIssueFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </SurfaceCard>

          <p className="text-sm text-[var(--muted-foreground)]">
            Fricções, falhas e dificuldades identificadas na experiência.
            Distintos das {CONCEPT_LABEL.lacunas.toLowerCase()} e das{" "}
            {CONCEPT_LABEL.opportunities.toLowerCase()}. Respondem: o que está
            funcionando mal?
          </p>

          {filteredIssues.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title={`Nenhum ${CONCEPT_LABEL.problema.toLowerCase()} cadastrado.`}
              description={`Não há ${CONCEPT_LABEL.problemas.toLowerCase()} no recorte atual. Cadastro em Configurações › ${CONCEPT_LABEL.problemas} (admin).`}
            />
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <SurfaceCard key={issue.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200 uppercase">
                          {CONCEPT_LABEL.issue}
                        </span>
                        <p className="text-sm font-semibold text-slate-900">
                          {issue.title}
                        </p>
                        <PriorityBadge priority={issue.priority} />
                        <span className="text-[11px] text-slate-500">
                          {gapTypeLabel[issue.type]} ·{" "}
                          {gapStatusLabel[issue.status]}
                        </span>
                      </div>
                      {issue.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {issue.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-slate-500">
                        {issue.audienceName}
                        {" · "}
                        {issue.journeyName}
                        {issue.featureName ? (
                          <>
                            {" · "}
                            {issue.featureHref ? (
                              <Link
                                href={issue.featureHref}
                                className="font-medium text-[var(--brand)] hover:underline"
                              >
                                {issue.featureName}
                              </Link>
                            ) : (
                              issue.featureName
                            )}
                          </>
                        ) : null}
                        {" · "}
                        Impacto: {priorityLabel[issue.impact]}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={issue.href}>
                          Mostrar {CONCEPT_LABEL.problema.toLowerCase()}
                        </Link>
                      </Button>
                      {canEdit && issue.featureHref ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={issue.featureHref}>Criar evolução</Link>
                        </Button>
                      ) : null}
                      {canEdit &&
                      (issue.status === "OPEN" ||
                        issue.status === "IN_PROGRESS") ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => resolveIssue(issue)}
                        >
                          Resolver
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
