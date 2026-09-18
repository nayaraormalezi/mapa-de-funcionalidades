import { listAuditLogs } from "@/services/audit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageBreadcrumb } from "@/components/ui/prototype";
import { isSupabaseEnabled } from "@/lib/supabase/server";

const actionLabel: Record<string, string> = {
  INSERT: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
};

export default async function AuditoriaPage() {
  const enabled = isSupabaseEnabled();
  const logs = enabled ? await listAuditLogs(150) : [];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <PageBreadcrumb
          items={[
            { label: "Configurações", href: "/configuracoes" },
            { label: "Auditoria" },
          ]}
        />
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Auditoria
        </h1>
        <p className="max-w-3xl text-sm text-[var(--muted-foreground)]">
          Histórico de alterações registradas automaticamente nas tabelas de
          domínio (insert/update/delete).
        </p>
      </section>

      {!enabled ? (
        <Card>
          <CardHeader>
            <CardTitle>Supabase desabilitado</CardTitle>
            <CardDescription>
              Ative NEXT_PUBLIC_USE_SUPABASE para consultar audit_logs.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sem eventos ainda</CardTitle>
            <CardDescription>
              Edite um cadastro como Admin/Editor para gerar o primeiro registro.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Últimos eventos</CardTitle>
            <CardDescription>{logs.length} registros mais recentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log) => (
              <article
                key={log.id}
                className="rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {actionLabel[log.action] ?? log.action} · {log.tableName}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Registro {log.recordId}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[var(--muted-foreground)]">
                    <p>
                      {log.actorEmail ?? "sistema"} ·{" "}
                      {(log.actorRole ?? "—").toUpperCase()}
                    </p>
                    <p>{new Date(log.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </article>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
