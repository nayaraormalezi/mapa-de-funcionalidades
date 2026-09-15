import Link from "next/link";
import { upsertRoadmapItem } from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { featureStatusLabel, featureStatusOptions } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { getDatabase } from "@/services/db";

export default async function CadastroRoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; feature?: string }>;
}) {
  const { edit, feature } = await searchParams;
  const db = await getDatabase();
  const items = db.roadmapItems;
  const editing = items.find((i) => i.id === edit);

  const contextOptions = db.channelContexts.map((cc) => {
    const audience = db.audiences.find((a) => a.id === cc.audienceId)?.name;
    const moment = db.moments.find((m) => m.id === cc.momentId)?.name;
    const channel = db.channels.find((c) => c.id === cc.channelId)?.name;
    return {
      value: cc.id,
      label: `${audience} · ${moment} · ${channel}`,
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
            Roadmap
          </h1>
        </div>
        <Link href="/configuracoes?tab=cadastros" className="text-sm text-[var(--brand)] hover:underline">
          Voltar
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} item de roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertRoadmapItem}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Funcionalidade"
                name="feature_id"
                as="select"
                required
                defaultValue={editing?.featureId ?? feature}
                options={db.features.map((f) => ({
                  value: f.id,
                  label: f.name,
                }))}
              />
              <Field
                label="Status"
                name="phase"
                as="select"
                required
                defaultValue={editing?.phase ?? "BACKLOG"}
                options={featureStatusOptions()}
              />
              <Field
                label="Contexto de canal"
                name="channel_context_id"
                as="select"
                defaultValue={editing?.channelContextId}
                options={contextOptions}
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
                label="Data real"
                name="actual_date"
                type="date"
                defaultValue={editing?.actualDate}
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
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {featureStatusLabel[item.phase as keyof typeof featureStatusLabel] ??
                    item.phase}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {db.features.find((f) => f.id === item.featureId)?.name} ·
                  Previsão {formatDate(item.expectedDate)}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/cadastros/roadmap?edit=${item.id}`}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                >
                  Editar
                </Link>
                <ArchiveButton table="roadmap_items" id={item.id} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
