import Link from "next/link";
import { upsertGap } from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import { BackButton } from "@/components/ui/back-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gapStatusLabel, gapTypeLabel, priorityLabel } from "@/lib/labels";
import { getDatabase } from "@/services/db";

export default async function CadastroGapsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const gaps = db.gaps;
  const editing = gaps.find((g) => g.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Gaps" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} gap</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertGap}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Título" name="title" required defaultValue={editing?.title} />
              <Field
                label="Tipo"
                name="type"
                as="select"
                defaultValue={editing?.type ?? "COVERAGE"}
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
                defaultValue={editing?.audienceId}
                options={db.audiences.map((a) => ({ value: a.id, label: a.name }))}
              />
              <Field
                label="Momento"
                name="moment_id"
                as="select"
                required
                defaultValue={editing?.momentId}
                options={db.moments.map((m) => ({ value: m.id, label: m.name }))}
              />
              <Field
                label="Jornada"
                name="journey_id"
                as="select"
                required
                defaultValue={editing?.journeyId}
                options={db.journeys.map((j) => ({ value: j.id, label: j.name }))}
              />
              <Field
                label="Necessidade"
                name="user_need_id"
                as="select"
                required
                defaultValue={editing?.userNeedId}
                options={db.userNeeds.map((n) => ({ value: n.id, label: n.name }))}
              />
              <Field
                label="Funcionalidade"
                name="feature_id"
                as="select"
                defaultValue={editing?.featureId}
                options={db.features.map((f) => ({ value: f.id, label: f.name }))}
              />
              <Field
                label="Canal atual"
                name="current_channel_id"
                as="select"
                defaultValue={editing?.currentChannelId}
                options={db.channels.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Field
                label="Canal futuro"
                name="future_channel_id"
                as="select"
                defaultValue={editing?.futureChannelId}
                options={db.channels.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Field
                label="Impacto"
                name="impact"
                as="select"
                defaultValue={editing?.impact ?? "MEDIUM"}
                options={Object.entries(priorityLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Prioridade"
                name="priority"
                as="select"
                defaultValue={editing?.priority ?? "MEDIUM"}
                options={Object.entries(priorityLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Status"
                name="status"
                as="select"
                defaultValue={editing?.status ?? "OPEN"}
                options={Object.entries(gapStatusLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Responsável"
                name="responsible"
                defaultValue={editing?.responsible}
              />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
            />
            <Field
              label="Plano de ação"
              name="action_plan"
              as="textarea"
              defaultValue={editing?.actionPlan}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_demo"
                value="true"
                defaultChecked={editing?.isDemo ?? true}
              />
              Marcar como DEMO
            </label>
          </CrudForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {gaps.map((gap) => (
            <div
              key={gap.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{gap.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {gapTypeLabel[gap.type]} · {gapStatusLabel[gap.status]}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/cadastros/gaps?edit=${gap.id}`}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                >
                  Editar
                </Link>
                <ArchiveButton table="gaps" id={gap.id} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <BackButton href="/configuracoes?tab=cadastros" />
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
          Cadastros
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {title}
        </h1>
      </div>
    </div>
  );
}
