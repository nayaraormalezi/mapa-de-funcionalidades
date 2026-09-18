"use client";

import { useActionState, useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUserAction,
  inviteUserAction,
  updateUserProfileAction,
  type UserActionResult,
} from "@/app/actions/users";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle, SurfaceCard } from "@/components/ui/prototype";
import { isMasterAdminEmail } from "@/lib/master-admin";
import { cn } from "@/lib/utils";
import type { UserProfile, UserRole } from "@/types";
import { Plus, Shield, Trash2, X } from "lucide-react";

const roleLabel: Record<UserRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

const roleHint: Record<UserRole, string> = {
  admin: "Acesso total, inclusive gestão de usuários e taxonomias.",
  editor: "Pode criar e editar conteúdo operacional (features, evidências, issues, evoluções).",
  viewer: "Somente leitura nas telas do PRISMA.",
};

const initial: UserActionResult | null = null;

export function UsersManager({
  users,
  currentUserId,
  isMasterAdmin,
}: {
  users: UserProfile[];
  currentUserId: string | null;
  isMasterAdmin: boolean;
}) {
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const [inviteOpen, setInviteOpen] = useState(false);
  const selected = users.find((u) => u.id === selectedId) ?? users[0];

  useEffect(() => {
    if (selectedId && !users.some((u) => u.id === selectedId)) {
      setSelectedId(users[0]?.id ?? "");
    }
  }, [users, selectedId]);

  return (
    <div className="space-y-4">
      {isMasterAdmin && inviteOpen ? (
        <InviteUserPanel onClose={() => setInviteOpen(false)} />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard className="p-4">
          <SectionTitle
            action={
              isMasterAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setInviteOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Convidar usuário
                </Button>
              ) : null
            }
          >
            Usuários cadastrados
          </SectionTitle>
          <p className="mb-3 text-xs text-[var(--muted-foreground)]">
            Edite nome, perfil de permissão e status de acesso.
            {isMasterAdmin
              ? " Como master, você também pode convidar e excluir usuários."
              : " Apenas administradores gerenciam usuários."}
          </p>
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {users.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
                Nenhum usuário encontrado.
              </li>
            ) : (
              users.map((user) => {
                const master = isMasterAdminEmail(user.email);
                const active = selected?.id === user.id;
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                        active ? "bg-[var(--brand-soft)]" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[11px] font-semibold text-white">
                        {initials(user.fullName || user.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-slate-900">
                            {user.fullName || user.email}
                          </span>
                          {master ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                              <Shield className="h-2.5 w-2.5" aria-hidden />
                              Master
                            </span>
                          ) : null}
                          {user.id === currentUserId ? (
                            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
                              você
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-[var(--muted-foreground)]">
                          {user.email}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1">
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                          {roleLabel[user.role]}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            user.active
                              ? "text-[var(--success)]"
                              : "text-[var(--danger)]",
                          )}
                        >
                          {user.active ? "Ativo" : "Inativo"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </SurfaceCard>

        <SurfaceCard className="p-4 xl:sticky xl:top-20 xl:self-start">
          <SectionTitle>Editar usuário</SectionTitle>
          {selected ? (
            <UserEditForm
              key={selected.id}
              user={selected}
              isMasterAdmin={isMasterAdmin}
              currentUserId={currentUserId}
            />
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              Selecione um usuário para editar.
            </p>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

function InviteUserPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const feedbackId = useId();
  const [state, formAction, pending] = useActionState(
    inviteUserAction,
    initial,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <SurfaceCard className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Convidar usuário
          </h3>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            Envia um e-mail de convite para @caixaconsorcio.com.br com o perfil
            escolhido.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm sm:col-span-1">
          <span className="font-medium text-slate-800">Nome</span>
          <Input
            name="full_name"
            disabled={pending}
            placeholder="Nome completo"
            className="h-10"
          />
        </label>
        <label className="block space-y-1.5 text-sm sm:col-span-1">
          <span className="font-medium text-slate-800">E-mail corporativo</span>
          <Input
            name="email"
            type="email"
            required
            disabled={pending}
            placeholder="nome@caixaconsorcio.com.br"
            className="h-10"
          />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-slate-800">
            Perfil de permissão
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(roleLabel) as UserRole[]).map((role) => (
              <label
                key={role}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5",
                  "has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)]",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  defaultChecked={role === "viewer"}
                  className="mt-1"
                  disabled={pending}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {roleLabel[role]}
                  </span>
                  <span className="block text-[11px] text-[var(--muted-foreground)]">
                    {roleHint[role]}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {state ? (
          <p
            id={feedbackId}
            role="status"
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm sm:col-span-2",
              state.ok
                ? "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]"
                : "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
            )}
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando convite…" : "Enviar convite"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </SurfaceCard>
  );
}

function UserEditForm({
  user,
  isMasterAdmin,
  currentUserId,
}: {
  user: UserProfile;
  isMasterAdmin: boolean;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const feedbackId = useId();
  const [state, formAction, pending] = useActionState(
    updateUserProfileAction,
    initial,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteUserAction,
    initial,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteTransitionPending, startDeleteTransition] = useTransition();
  const master = isMasterAdminEmail(user.email);
  const canEditAdminRole = isMasterAdmin || user.role !== "admin";
  const canDelete =
    isMasterAdmin && !master && user.id !== currentUserId;
  const busy = pending || deletePending || deleteTransitionPending;

  useEffect(() => {
    if (state?.ok || deleteState?.ok) router.refresh();
  }, [state, deleteState, router]);

  return (
    <>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="user_id" value={user.id} />

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-slate-800">Nome</span>
          <Input
            name="full_name"
            defaultValue={user.fullName}
            disabled={busy}
            className="h-10"
          />
        </label>

        <div className="space-y-1.5 text-sm">
          <span className="font-medium text-slate-800">E-mail</span>
          <Input value={user.email} disabled className="h-10 bg-slate-50" />
        </div>

        <fieldset
          className="space-y-2"
          disabled={busy || master || !canEditAdminRole}
        >
          <legend className="text-sm font-medium text-slate-800">
            Perfil de permissão
          </legend>
          {(Object.keys(roleLabel) as UserRole[]).map((role) => (
            <label
              key={role}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5",
                "has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--brand-soft)]",
              )}
            >
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={user.role === role}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  {roleLabel[role]}
                </span>
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {roleHint[role]}
                </span>
              </span>
            </label>
          ))}
          {master ? (
            <p className="text-xs text-amber-800">
              Conta master: o papel Administrador é permanente.
            </p>
          ) : !canEditAdminRole ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Somente o administrador master pode alterar outros
              administradores.
            </p>
          ) : null}
        </fieldset>

        {master ? <input type="hidden" name="role" value="admin" /> : null}
        {!canEditAdminRole && !master ? (
          <input type="hidden" name="role" value={user.role} />
        ) : null}

        <label
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm",
            master && "opacity-70",
          )}
        >
          <span>
            <span className="block font-medium text-slate-800">
              Acesso ativo
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              Usuários inativos entram como visualizadores sem edição.
            </span>
          </span>
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={user.active}
            disabled={busy || master}
            className="h-4 w-4"
          />
        </label>
        {master ? <input type="hidden" name="active" value="true" /> : null}

        {state ? (
          <p
            id={feedbackId}
            role="status"
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              state.ok
                ? "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]"
                : "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
            )}
          >
            {state.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </form>

      {canDelete ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {deleteState && !deleteState.ok ? (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
            >
              {deleteState.message}
            </p>
          ) : null}
          {deleteState?.ok ? (
            <p
              role="status"
              className="mb-3 rounded-lg border border-[var(--success-soft)] bg-[var(--success-soft)] px-3 py-2.5 text-sm text-[var(--success)]"
            >
              {deleteState.message}
            </p>
          ) : null}
          <Button
            type="button"
            variant="danger"
            className="w-full"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir usuário
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir usuário"
        description={`Tem certeza que deseja excluir permanentemente ${
          user.fullName || user.email
        }? Esta ação não pode ser desfeita.`}
        confirmLabel={
          deletePending || deleteTransitionPending ? "Excluindo…" : "Excluir"
        }
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => {
          if (!deletePending && !deleteTransitionPending) {
            setConfirmDelete(false);
          }
        }}
        onConfirm={() => {
          const fd = new FormData();
          fd.set("user_id", user.id);
          startDeleteTransition(() => {
            deleteAction(fd);
            setConfirmDelete(false);
          });
        }}
      />
    </>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "UX"
  );
}
