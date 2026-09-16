import Link from "next/link";
import { upsertFeature } from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import {
  ArchiveButton,
  DuplicateFeatureButton,
} from "@/components/cadastros/row-actions";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { BackButton } from "@/components/ui/back-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDatabase } from "@/services/db";
import { priorityLabel } from "@/lib/labels";

export default async function CadastroFuncionalidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const features = db.features.filter((f) => f.active);
  const capabilities = db.capabilities;
  const editing = features.find((f) => f.id === edit);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--brand)] uppercase">
            Cadastros
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Funcionalidades
          </h1>
        </div>
        <BackButton href="/configuracoes?tab=cadastros" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Nova"} funcionalidade</CardTitle>
          <CardDescription>
            A funcionalidade é única; o status por canal fica em Status por
            contexto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertFeature}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome" name="name" required defaultValue={editing?.name} />
              <Field
                label="Capacidade"
                name="capability_id"
                as="select"
                required
                defaultValue={editing?.capabilityId}
                options={capabilities.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              <Field
                label="Produto"
                name="product"
                defaultValue={editing?.product ?? "Consórcio"}
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
              <Field label="Owner" name="owner" defaultValue={editing?.owner} />
              <Field
                label="UX Owner"
                name="ux_owner"
                defaultValue={editing?.uxOwner}
              />
              <Field
                label="CX Owner"
                name="cx_owner"
                defaultValue={editing?.cxOwner}
              />
              <Field
                label="Product Owner"
                name="product_owner"
                defaultValue={editing?.productOwner}
              />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
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
          {features.map((feature) => (
            <div
              key={feature.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{feature.name}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <PriorityBadge priority={feature.priority} />
                  {feature.isDemo ? (
                    <span className="text-[10px] font-bold text-amber-700 uppercase">
                      DEMO
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/cadastros/funcionalidades?edit=${feature.id}`}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                >
                  Editar
                </Link>
                <DuplicateFeatureButton featureId={feature.id} />
                <ArchiveButton table="features" id={feature.id} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
