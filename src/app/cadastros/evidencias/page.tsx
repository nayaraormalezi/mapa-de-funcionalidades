import Link from "next/link";
import { upsertEvidence } from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import {
  EvidenceAttachmentView,
  EvidenceFileField,
} from "@/components/feature/evidence-file-field";
import { BackButton } from "@/components/ui/back-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withEvidenceFileUrls } from "@/lib/evidence-files";
import { evidenceTypeLabel } from "@/lib/labels";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { getDatabase } from "@/services/db";

export default async function CadastroEvidenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; feature?: string }>;
}) {
  const { edit, feature } = await searchParams;
  const db = await getDatabase();
  const itemsRaw = db.evidences;
  const items = isSupabaseEnabled()
    ? await withEvidenceFileUrls(itemsRaw)
    : itemsRaw.map((i) => ({ ...i, fileUrl: null }));
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Evidências" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Nova"} evidência</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertEvidence}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Título"
                name="title"
                required
                defaultValue={editing?.title}
              />
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
                label="Tipo"
                name="type"
                as="select"
                defaultValue={editing?.type ?? "OTHER"}
                options={Object.entries(evidenceTypeLabel).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
              <Field
                label="Data"
                name="evidence_date"
                type="date"
                defaultValue={editing?.date}
              />
              <Field
                label="Responsável"
                name="responsible"
                defaultValue={editing?.responsible}
              />
              <Field label="Link" name="link" defaultValue={editing?.link} />
            </div>
            <EvidenceFileField
              existingFileName={editing?.fileName}
              existingFileMime={editing?.fileMime}
              existingFileSize={editing?.fileSize}
              existingFileUrl={editing?.fileUrl}
            />
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {evidenceTypeLabel[item.type]} · {formatDate(item.date)} ·{" "}
                  {db.features.find((f) => f.id === item.featureId)?.name}
                </p>
                <EvidenceAttachmentView
                  fileName={item.fileName}
                  fileMime={item.fileMime}
                  fileSize={item.fileSize}
                  fileUrl={item.fileUrl}
                />
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/cadastros/evidencias?edit=${item.id}`}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                >
                  Editar
                </Link>
                <ArchiveButton table="evidences" id={item.id} />
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
          Cadastros
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {title}
        </h1>
      </div>
      <BackButton href="/configuracoes?tab=cadastros" />
    </div>
  );
}
