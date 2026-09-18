"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  PageHeader,
  SectionTitle,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import {
  Boxes,
  ClipboardList,
  GitBranch,
  Layers3,
  MapPinned,
  Radio,
  ScrollText,
  ShieldAlert,
  Users,
  Waypoints,
} from "lucide-react";
import { CONCEPT_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";
import { UsersManager } from "./users-manager";

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

const cadastros = [
  { href: "/cadastros/publicos", title: "Públicos", icon: Users },
  { href: "/cadastros/momentos", title: "Momentos", icon: Waypoints },
  { href: "/cadastros/jornadas", title: "Jornadas", icon: GitBranch },
  { href: "/cadastros/necessidades", title: "Necessidades", icon: MapPinned },
  { href: "/cadastros/capacidades", title: "Capacidades", icon: Layers3 },
  { href: "/cadastros/funcionalidades", title: "Funcionalidades", icon: Boxes },
  { href: "/cadastros/canais", title: "Canais", icon: Radio },
  { href: "/cadastros/contextos", title: "Contextos de canal", icon: Radio },
  {
    href: "/cadastros/status-contexto",
    title: "Status por contexto",
    icon: Boxes,
  },
  { href: "/cadastros/roadmap", title: "Planejamento legado", icon: GitBranch },
  { href: "/cadastros/evidencias", title: "Evidências", icon: Layers3 },
  { href: "/cadastros/gaps", title: CONCEPT_LABEL.issues, icon: ShieldAlert },
];

type Tab =
  | "overview"
  | "users"
  | "cadastros"
  | "integracoes"
  | "preferencias"
  | "dados"
  | "auditoria";

export function ConfiguracoesClient({
  displayName,
  email,
  role,
  canEdit,
  canAdmin,
  isAdmin,
  isMasterAdmin,
  currentUserId,
  users,
  initialTab = "overview",
}: {
  displayName: string;
  email: string;
  role: string;
  canEdit: boolean;
  canAdmin?: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  currentUserId: string | null;
  users: UserProfile[];
  initialTab?: Tab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const admin = canAdmin ?? isAdmin;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "UX";

  function changeTab(id: string) {
    const next = id as Tab;
    if (next === "cadastros" && !admin) return;
    setTab(next);
    const href =
      next === "overview"
        ? "/configuracoes"
        : `/configuracoes?tab=${next}`;
    router.replace(href, { scroll: false });
  }

  const tabOptions = [
    { id: "overview", label: "Visão geral" },
    { id: "users", label: "Gestão de usuários" },
    ...(admin
      ? [{ id: "cadastros", label: "Cadastros e taxonomias" }]
      : []),
    { id: "integracoes", label: "Integrações" },
    { id: "preferencias", label: "Preferências" },
    { id: "dados", label: "Dados e importação" },
    { id: "auditoria", label: "Auditoria" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Configurações" }]}
        title="Configurações"
        description="Gerencie dados, permissões, integrações e preferências da plataforma."
      />

      <UnderlineTabs
        value={tab}
        onChange={changeTab}
        options={tabOptions}
      />

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickCard
              value={String(users.length || "—")}
              label="Usuários"
              href="/configuracoes?tab=users"
              linkLabel="Gerenciar acessos →"
            />
            <QuickCard
              value="—"
              label="Jornadas"
              href="/jornadas"
              linkLabel="Mostrar jornadas →"
            />
            <QuickCard
              value="—"
              label="Canais"
              href="/canais"
              linkLabel="Mostrar canais →"
            />
            {admin ? (
              <QuickCard
                value="—"
                label="Cadastros e taxonomias"
                href="/configuracoes?tab=cadastros"
                linkLabel="Abrir cadastros →"
              />
            ) : (
              <QuickCard
                value={roleLabel[role] ?? role}
                label="Seu perfil"
                href="/configuracoes?tab=preferencias"
                linkLabel="Preferências →"
              />
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <SurfaceCard className="p-4">
              <SectionTitle
                action={
                  <span className="text-xs font-medium text-[var(--brand)]">
                    Editar
                  </span>
                }
              >
                Informações da organização
              </SectionTitle>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white">
                  CX
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    CAIXA Consórcio
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Funcionalidades UX + CX
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Plataforma interna para mapeamento de funcionalidades, jornadas,
                canais e oportunidades de melhoria.
              </p>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <InfoRow label="Área responsável" value="UX + CX" />
                <InfoRow label="Product Owner" value={displayName} />
                <InfoRow label="Time" value="Experiência do Cliente" />
                <InfoRow label="Versão" value="1.0.0" />
              </dl>
            </SurfaceCard>

            <UserCard
              displayName={displayName}
              email={email}
              role={role}
              canEdit={canEdit}
              initials={initials}
            />
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        admin ? (
          <UsersManager
            users={users}
            currentUserId={currentUserId}
            isMasterAdmin={isMasterAdmin}
          />
        ) : (
          <SurfaceCard className="p-4">
            <SectionTitle>Gestão de usuários</SectionTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Apenas administradores podem editar usuários e perfis de
              permissão. Solicite acesso ao administrador master.
            </p>
          </SurfaceCard>
        )
      ) : null}

      {tab === "cadastros" ? (
        admin ? (
          <SurfaceCard className="p-4">
            <SectionTitle>Cadastros e taxonomias</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cadastros.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:border-[var(--brand)] hover:bg-slate-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-slate-800">
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="p-4">
            <SectionTitle>Cadastros e taxonomias</SectionTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Apenas administradores podem acessar os cadastros e taxonomias.
            </p>
          </SurfaceCard>
        )
      ) : null}

      {tab === "integracoes" ? (
        <SurfaceCard className="p-4">
          <SectionTitle>Integrações</SectionTitle>
          <ul className="space-y-2">
            {[
              {
                name: "Figma",
                desc: "Importe links de protótipos e documentos.",
                status: "Conectado",
              },
              {
                name: "Jira",
                desc: "Sincronize iniciativas e status das entregas.",
                status: "Conectado",
              },
              {
                name: "Confluence",
                desc: "Centralize documentação e decisões.",
                status: "Conectado",
              },
              {
                name: "Microsoft Teams",
                desc: "Receba notificações e atualizações.",
                status: "Conectar",
              },
            ].map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {item.desc}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    item.status === "Conectado"
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Status das integrações é ilustrativo nesta versão — sem novos
            backends.
          </p>
        </SurfaceCard>
      ) : null}

      {tab === "preferencias" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <SurfaceCard className="p-4">
            <SectionTitle>Preferências pessoais</SectionTitle>
            <dl className="space-y-2 text-sm">
              <InfoRow label="Nome" value={displayName} />
              <InfoRow label="Função" value={roleLabel[role] ?? role} />
              <InfoRow label="E-mail" value={email || "—"} />
              <InfoRow label="Tema" value="Claro" />
            </dl>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                Notificações
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                {[
                  "Novas oportunidades",
                  "Atualizações de entregas",
                  "Menções e comentários",
                  "Resumo semanal por e-mail",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                  >
                    <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-white" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </SurfaceCard>
          <UserCard
            displayName={displayName}
            email={email}
            role={role}
            canEdit={canEdit}
            initials={initials}
          />
        </div>
      ) : null}

      {tab === "dados" ? (
        <SurfaceCard className="p-4">
          <SectionTitle>Dados e importação</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              {
                title: "Importar funcionalidades",
                desc: "CSV, Excel ou integração via API",
              },
              {
                title: "Exportar dados",
                desc: "Gere uma cópia dos dados da plataforma",
              },
              {
                title: "Histórico de importações",
                desc: "Acompanhe as últimas atualizações",
              },
              {
                title: "Modelo de importação",
                desc: "Baixe o template em Excel",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--border)] px-3 py-3"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      {tab === "auditoria" ? (
        <SurfaceCard className="p-4">
          <SectionTitle>Segurança e auditoria</SectionTitle>
          <ul className="mb-4 space-y-2 text-sm">
            <li className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <span>Autenticação</span>
              <span className="text-xs font-medium text-[var(--success)]">
                Via EntraID (SSO) · Ativo
              </span>
            </li>
            <li className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <span>Perfis e permissões</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Controle de acesso por função
              </span>
            </li>
            <li className="flex justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <span>Política de dados</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                LGPD e boas práticas
              </span>
            </li>
          </ul>
          <Link
            href="/auditoria"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <ScrollText className="h-4 w-4" />
            Mostrar logs →
          </Link>
        </SurfaceCard>
      ) : null}
    </div>
  );
}

function QuickCard({
  value,
  label,
  href,
  linkLabel,
}: {
  value: string;
  label: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <SurfaceCard className="p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{label}</p>
      <Link
        href={href}
        className="mt-2 inline-block text-xs font-medium text-[var(--brand)] hover:underline"
      >
        {linkLabel}
      </Link>
    </SurfaceCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[var(--border)] py-2">
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function UserCard({
  displayName,
  email,
  role,
  canEdit,
  initials,
}: {
  displayName: string;
  email: string;
  role: string;
  canEdit: boolean;
  initials: string;
}) {
  return (
    <SurfaceCard className="p-4 xl:sticky xl:top-20 xl:self-start">
      <SectionTitle>Usuário atual</SectionTitle>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-semibold text-white">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{displayName}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{email}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-[var(--muted-foreground)]">Papel</span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200">
            {roleLabel[role] ?? role}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
          <span className="text-[var(--muted-foreground)]">Edição</span>
          <span className="font-medium">
            {canEdit ? "Permitida" : "Somente leitura"}
          </span>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
        <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Administradores gerenciam usuários e perfis em Configurações → Gestão de
        usuários.
      </p>
    </SurfaceCard>
  );
}
