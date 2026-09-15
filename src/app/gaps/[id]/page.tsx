import Link from "next/link";
import { notFound } from "next/navigation";
import { upsertGap } from "@/app/actions/crud";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  evidenceTypeLabel,
  gapStatusLabel,
  gapTypeLabel,
  priorityLabel,
} from "@/lib/labels";
import { getDatabase } from "@/services/db";
import { getGapById } from "@/services/gaps";
import { ArrowLeft } from "lucide-react";

export default async function GapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gap = await getGapById(id);
  if (!gap) notFound();

  const db = await getDatabase();
  const feature = gap.featureId
    ? db.features.find((f) => f.id === gap.featureId)
    : undefined;
  const audience = db.audiences.find((a) => a.id === gap.audienceId);
  const moment = db.moments.find((m) => m.id === gap.momentId);
  const journey = db.journeys.find((j) => j.id === gap.journeyId);
  const need = db.userNeeds.find((n) => n.id === gap.userNeedId);
  const currentChannel = gap.currentChannelId
    ? db.channels.find((c) => c.id === gap.currentChannelId)
    : undefined;
  const futureChannel = gap.futureChannelId
    ? db.channels.find((c) => c.id === gap.futureChannelId)
    : undefined;
  const evidences = db.evidences.filter((e) =>
    gap.evidenceIds.includes(e.id),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/gaps">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar aos gaps
          </Link>
        </Button>
        {feature ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/funcionalidades/${feature.id}`}>
              Abrir funcionalidade
            </Link>
          </Button>
        ) : null}
        <ArchiveButton table="gaps" id={gap.id} />
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-rose-800 ring-1 ring-rose-200 uppercase">
            {gapTypeLabel[gap.type]}
          </span>
          <PriorityBadge priority={gap.priority} />
          <span className="text-xs text-[var(--muted-foreground)]">
            {gapStatusLabel[gap.status]}
          </span>
          {gap.isDemo ? (
            <span className="text-[10px] font-bold text-amber-700 uppercase">
              DEMO
            </span>
          ) : null}
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          {gap.title}
        </h1>
        <p className="max-w-3xl text-sm text-[var(--muted-foreground)]">
          {gap.description}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetaCard label="Público" value={audience?.name ?? "—"} />
        <MetaCard label="Momento" value={moment?.name ?? "—"} />
        <MetaCard label="Jornada" value={journey?.name ?? "—"} />
        <MetaCard label="Necessidade" value={need?.name ?? "—"} />
        <MetaCard label="Funcionalidade" value={feature?.name ?? "—"} />
        <MetaCard label="Canal atual" value={currentChannel?.name ?? "—"} />
        <MetaCard label="Canal futuro" value={futureChannel?.name ?? "—"} />
        <MetaCard label="Responsável" value={gap.responsible || "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plano de ação</CardTitle>
          <CardDescription>{gap.actionPlan || "Sem plano definido."}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidências relacionadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {evidences.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma evidência vinculada a este gap.
            </p>
          ) : (
            evidences.map((evidence) => (
              <div
                key={evidence.id}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <p className="font-medium">{evidence.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {evidenceTypeLabel[evidence.type]} · {evidence.responsible}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar gap</CardTitle>
          <CardDescription>
            Atualize impacto, prioridade, status e plano de ação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrudForm action={upsertGap}>
            <input type="hidden" name="id" value={gap.id} />
            {gap.isDemo ? (
              <input type="hidden" name="is_demo" value="true" />
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Título" name="title" required defaultValue={gap.title} />
              <Field
                label="Tipo"
                name="type"
                as="select"
                defaultValue={gap.type}
                options={Object.entries(gapTypeLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Público"
                name="audience_id"
                as="select"
                required
                defaultValue={gap.audienceId}
                options={db.audiences.map((a) => ({
                  value: a.id,
                  label: a.name,
                }))}
              />
              <Field
                label="Momento"
                name="moment_id"
                as="select"
                required
                defaultValue={gap.momentId}
                options={db.moments.map((m) => ({
                  value: m.id,
                  label: m.name,
                }))}
              />
              <Field
                label="Jornada"
                name="journey_id"
                as="select"
                required
                defaultValue={gap.journeyId}
                options={db.journeys.map((j) => ({
                  value: j.id,
                  label: j.name,
                }))}
              />
              <Field
                label="Necessidade"
                name="user_need_id"
                as="select"
                required
                defaultValue={gap.userNeedId}
                options={db.userNeeds.map((n) => ({
                  value: n.id,
                  label: n.name,
                }))}
              />
              <Field
                label="Funcionalidade"
                name="feature_id"
                as="select"
                defaultValue={gap.featureId}
                options={db.features.map((f) => ({
                  value: f.id,
                  label: f.name,
                }))}
              />
              <Field
                label="Canal atual"
                name="current_channel_id"
                as="select"
                defaultValue={gap.currentChannelId}
                options={db.channels.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              <Field
                label="Canal futuro"
                name="future_channel_id"
                as="select"
                defaultValue={gap.futureChannelId}
                options={db.channels.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              <Field
                label="Impacto"
                name="impact"
                as="select"
                defaultValue={gap.impact}
                options={Object.entries(priorityLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Prioridade"
                name="priority"
                as="select"
                defaultValue={gap.priority}
                options={Object.entries(priorityLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Status"
                name="status"
                as="select"
                defaultValue={gap.status}
                options={Object.entries(gapStatusLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Responsável"
                name="responsible"
                defaultValue={gap.responsible}
              />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={gap.description}
            />
            <Field
              label="Plano de ação"
              name="action_plan"
              as="textarea"
              defaultValue={gap.actionPlan}
            />
          </CrudForm>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-base">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
