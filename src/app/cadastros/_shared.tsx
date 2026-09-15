import Link from "next/link";
import {
  upsertAudience,
  upsertCapability,
  upsertChannel,
  upsertChannelContext,
  upsertMoment,
  upsertUserNeed,
} from "@/app/actions/crud";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { temporalStatusLabel } from "@/lib/labels";
import { getAuthState } from "@/lib/auth";
import { getDatabase } from "@/services/db";

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
      <Link href="/configuracoes?tab=cadastros" className="text-sm text-[var(--brand)] hover:underline">
        Voltar
      </Link>
    </div>
  );
}

export async function PublicosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const { canEdit } = await getAuthState();
  const items = db.audiences.filter((a) => a.active);
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Públicos" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} público</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertAudience}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Código" name="code" required defaultValue={editing?.code} />
              <Field label="Nome" name="name" required defaultValue={editing?.name} />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
            />
          </CrudForm>
        </CardContent>
      </Card>
      <List
        canEdit={canEdit}
        items={items.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.code,
          editHref: `/cadastros/publicos?edit=${i.id}`,
          table: "audiences",
        }))}
      />
    </div>
  );
}

export async function MomentosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const { canEdit } = await getAuthState();
  const items = db.moments.filter((m) => m.active);
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Momentos" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} momento</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertMoment}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Código" name="code" required defaultValue={editing?.code} />
              <Field label="Nome" name="name" required defaultValue={editing?.name} />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
            />
          </CrudForm>
        </CardContent>
      </Card>
      <List
        canEdit={canEdit}
        items={items.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.code,
          editHref: `/cadastros/momentos?edit=${i.id}`,
          table: "moments",
        }))}
      />
    </div>
  );
}

export async function NecessidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const { canEdit } = await getAuthState();
  const items = db.userNeeds.filter((n) => n.active);
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Necessidades" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Nova"} necessidade</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertUserNeed}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome" name="name" required defaultValue={editing?.name} />
              <Field
                label="Jornada"
                name="journey_id"
                as="select"
                required
                defaultValue={editing?.journeyId}
                options={db.journeys.map((j) => ({ value: j.id, label: j.name }))}
              />
              <Field
                label="Prioridade"
                name="priority"
                as="select"
                defaultValue={editing?.priority ?? "MEDIUM"}
                options={[
                  { value: "CRITICAL", label: "Crítica" },
                  { value: "HIGH", label: "Alta" },
                  { value: "MEDIUM", label: "Média" },
                  { value: "LOW", label: "Baixa" },
                ]}
              />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
            />
          </CrudForm>
        </CardContent>
      </Card>
      <List
        canEdit={canEdit}
        items={items.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: db.journeys.find((j) => j.id === i.journeyId)?.name ?? "",
          editHref: `/cadastros/necessidades?edit=${i.id}`,
          table: "user_needs",
        }))}
      />
    </div>
  );
}

export async function CapacidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const { canEdit } = await getAuthState();
  const items = db.capabilities;
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Capacidades" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Nova"} capacidade</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertCapability}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome" name="name" required defaultValue={editing?.name} />
              <Field
                label="Necessidade"
                name="user_need_id"
                as="select"
                required
                defaultValue={editing?.userNeedId}
                options={db.userNeeds.map((n) => ({ value: n.id, label: n.name }))}
              />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
            />
          </CrudForm>
        </CardContent>
      </Card>
      <List
        canEdit={canEdit}
        items={items.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle:
            db.userNeeds.find((n) => n.id === i.userNeedId)?.name ?? "",
          editHref: `/cadastros/capacidades?edit=${i.id}`,
          table: "capabilities",
        }))}
      />
    </div>
  );
}

export async function CanaisPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const { canEdit } = await getAuthState();
  const items = db.channels.filter((c) => c.active);
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Canais" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} canal</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertChannel}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Nome" name="name" required defaultValue={editing?.name} />
              <Field label="Tipo" name="type" defaultValue={editing?.type ?? "digital"} />
            </div>
            <Field
              label="Descrição"
              name="description"
              as="textarea"
              defaultValue={editing?.description}
            />
          </CrudForm>
        </CardContent>
      </Card>
      <List
        canEdit={canEdit}
        items={items.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.type,
          editHref: `/cadastros/canais?edit=${i.id}`,
          table: "channels",
        }))}
      />
    </div>
  );
}

export async function ContextosPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const db = await getDatabase();
  const { canEdit } = await getAuthState();
  const items = db.channelContexts.filter((c) => c.active);
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="space-y-6">
      <Header title="Contextos de canal" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Editar" : "Novo"} contexto</CardTitle>
        </CardHeader>
        <CardContent>
          <CrudForm key={editing?.id ?? "new"} action={upsertChannelContext}>
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
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
                label="Canal"
                name="channel_id"
                as="select"
                required
                defaultValue={editing?.channelId}
                options={db.channels.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Field
                label="Situação temporal"
                name="temporal_status"
                as="select"
                defaultValue={editing?.temporalStatus ?? "CURRENT"}
                options={Object.entries(temporalStatusLabel).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>
            <Field
              label="Notas"
              name="notes"
              as="textarea"
              defaultValue={editing?.notes}
            />
          </CrudForm>
        </CardContent>
      </Card>
      <List
        canEdit={canEdit}
        items={items.map((i) => {
          const audience = db.audiences.find((a) => a.id === i.audienceId)?.name;
          const moment = db.moments.find((m) => m.id === i.momentId)?.name;
          const channel = db.channels.find((c) => c.id === i.channelId)?.name;
          return {
            id: i.id,
            title: `${channel}`,
            subtitle: `${audience} · ${moment} · ${temporalStatusLabel[i.temporalStatus]}`,
            editHref: `/cadastros/contextos?edit=${i.id}`,
            table: "channel_contexts",
          };
        })}
      />
    </div>
  );
}

function List({
  items,
  canEdit,
}: {
  items: {
    id: string;
    title: string;
    subtitle: string;
    editHref: string;
    table: string;
  }[];
  canEdit: boolean;
}) {
  return (
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
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {item.subtitle}
              </p>
            </div>
            {canEdit ? (
              <div className="flex gap-2">
                <Link
                  href={item.editHref}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                >
                  Editar
                </Link>
                <ArchiveButton table={item.table} id={item.id} />
              </div>
            ) : (
              <span className="text-[10px] font-medium tracking-wide text-[var(--muted-foreground)] uppercase">
                Somente leitura
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
