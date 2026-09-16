import Link from "next/link";
import { upsertFeatureChannelContext } from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import { StageBadge } from "@/components/badges/stage-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { BackButton } from "@/components/ui/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  experienceLabel,
  featureStageOptions,
  featureStatusOptions,
} from "@/lib/labels";
import { getDatabase } from "@/services/db";

export default async function StatusContextoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const items = db.featureChannelContexts;
  const editing = items.find((i) => i.id === edit);

  const contextOptions = db.channelContexts.map((cc) => {
    const audience = db.audiences.find((a) => a.id === cc.audienceId)?.name;
    const moment = db.moments.find((m) => m.id === cc.momentId)?.name;
    const channel = db.channels.find((c) => c.id === cc.channelId)?.name;
    return {
      value: cc.id,
      label: `${audience} · ${moment} · ${channel} (${cc.temporalStatus})`,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
            Cadastros
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Status por contexto
          </h1>
        </div>
        <BackButton href="/configuracoes?tab=cadastros" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} status</CardTitle>
          <CardDescription>
            Relacionamento Feature + Público + Momento + Canal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertFeatureChannelContext}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Funcionalidade"
                name="feature_id"
                as="select"
                required
                defaultValue={editing?.featureId}
                options={db.features.map((f) => ({ value: f.id, label: f.name }))}
              />
              <Field
                label="Contexto de canal"
                name="channel_context_id"
                as="select"
                required
                defaultValue={editing?.channelContextId}
                options={contextOptions}
              />
              <Field
                label="Status"
                name="status"
                as="select"
                defaultValue={editing?.status ?? "NO_DEADLINE"}
                options={featureStatusOptions()}
              />
              <Field
                label="Etapa"
                name="phase"
                as="select"
                defaultValue={editing?.phase ?? "BACKLOG"}
                options={featureStageOptions()}
              />
              <Field
                label="Experiência"
                name="experience"
                as="select"
                defaultValue={editing?.experience ?? "NOT_EVALUATED"}
                options={Object.entries(experienceLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <Field
                label="Responsável"
                name="responsible"
                defaultValue={editing?.responsible}
              />
              <Field
                label="Início"
                name="start_date"
                type="date"
                defaultValue={editing?.startDate}
              />
              <Field
                label="Previsão"
                name="expected_date"
                type="date"
                defaultValue={editing?.expectedDate}
              />
              <Field
                label="Go-live"
                name="launch_date"
                type="date"
                defaultValue={editing?.launchDate}
              />
            </div>
            <Field
              label="Observações"
              name="notes"
              as="textarea"
              defaultValue={editing?.notes}
            />
          </CrudForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const feature = db.features.find((f) => f.id === item.featureId);
            const context = contextOptions.find(
              (c) => c.value === item.channelContextId,
            );
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{feature?.name ?? item.featureId}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {context?.label}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <StatusBadge status={item.status} />
                    <StageBadge stage={item.phase} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/cadastros/status-contexto?edit=${item.id}`}
                    className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                  >
                    Editar
                  </Link>
                  <ArchiveButton table="feature_channel_contexts" id={item.id} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
