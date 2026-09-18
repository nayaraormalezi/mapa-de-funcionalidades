"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin, requireMasterAdmin } from "@/lib/auth";
import { validateCorporateEmail } from "@/lib/corporate-email";
import { isMasterAdminEmail } from "@/lib/master-admin";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export type UserActionResult = {
  ok: boolean;
  message: string;
};

const ALLOWED_ROLES: UserRole[] = ["admin", "editor", "viewer"];

function isUserRole(value: string): value is UserRole {
  return (ALLOWED_ROLES as string[]).includes(value);
}

async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function adminUnavailableMessage() {
  return "Gestão avançada de usuários indisponível: configure SUPABASE_SERVICE_ROLE_KEY no servidor.";
}

export async function updateUserProfileAction(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Modo demonstração: gestão de usuários não está disponível. Ative o modo LIVE (Supabase) para gerenciar contas.",
    };
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  const activeRaw = String(formData.get("active") ?? "true");
  const active = activeRaw === "true" || activeRaw === "on";

  if (!userId) {
    return { ok: false, message: "Usuário inválido." };
  }

  if (!isUserRole(roleRaw)) {
    return { ok: false, message: "Perfil de permissão inválido." };
  }

  const supabase = await createClient();
  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("id, email, role, active")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError || !target) {
    console.error("[profiles:update:fetch]", fetchError?.message);
    return { ok: false, message: "Não foi possível carregar o usuário." };
  }

  if (isMasterAdminEmail(target.email)) {
    if (roleRaw !== "admin" || !active) {
      return {
        ok: false,
        message:
          "O administrador master não pode ter o papel alterado nem ser desativado.",
      };
    }
  }

  if (
    !gate.auth.isMasterAdmin &&
    (target.role === "admin" || roleRaw === "admin") &&
    (target.role !== roleRaw || target.active !== active)
  ) {
    return {
      ok: false,
      message:
        "Somente o administrador master pode alterar papéis de administradores.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || target.email.split("@")[0],
      role: roleRaw,
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("[profiles:update]", error.message);
    return {
      ok: false,
      message:
        "Não foi possível salvar as alterações. Verifique suas permissões e tente novamente.",
    };
  }

  revalidatePath("/configuracoes");
  return { ok: true, message: "Usuário atualizado com sucesso." };
}

export async function inviteUserAction(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const gate = await requireMasterAdmin();
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Modo demonstração: gestão de usuários não está disponível. Ative o modo LIVE (Supabase) para gerenciar contas.",
    };
  }

  if (!isAdminClientConfigured()) {
    return { ok: false, message: adminUnavailableMessage() };
  }

  const emailRaw = String(formData.get("email") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "viewer").trim();

  const emailCheck = validateCorporateEmail(emailRaw);
  if (!emailCheck.ok) {
    return { ok: false, message: emailCheck.message };
  }
  const email = emailCheck.email;

  if (isMasterAdminEmail(email)) {
    return {
      ok: false,
      message: "Este e-mail já corresponde ao administrador master.",
    };
  }

  if (!isUserRole(roleRaw)) {
    return { ok: false, message: "Perfil de permissão inválido." };
  }

  const origin = await getSiteOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/login")}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName || email.split("@")[0],
      },
      redirectTo,
    });

    if (error) {
      console.error("[users:invite]", error.message);
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return {
          ok: false,
          message: "Este e-mail já possui uma conta no PRISMA.",
        };
      }
      return {
        ok: false,
        message: "Não foi possível enviar o convite. Tente novamente.",
      };
    }

    const invitedId = data.user?.id;
    if (invitedId) {
      const { error: profileError } = await admin
        .from("profiles")
        .upsert(
          {
            id: invitedId,
            email,
            full_name: fullName || email.split("@")[0],
            role: roleRaw,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (profileError) {
        console.error("[users:invite:profile]", profileError.message);
      }
    }

    revalidatePath("/configuracoes");
    return {
      ok: true,
      message: `Convite enviado para ${email}. A pessoa receberá um e-mail para definir a senha.`,
    };
  } catch (err) {
    console.error("[users:invite:unexpected]", err);
    return {
      ok: false,
      message: adminUnavailableMessage(),
    };
  }
}

export async function deleteUserAction(
  _prev: UserActionResult | null,
  formData: FormData,
): Promise<UserActionResult> {
  const gate = await requireMasterAdmin();
  if (!gate.ok) {
    return { ok: false, message: gate.message };
  }

  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Modo demonstração: gestão de usuários não está disponível. Ative o modo LIVE (Supabase) para gerenciar contas.",
    };
  }

  if (!isAdminClientConfigured()) {
    return { ok: false, message: adminUnavailableMessage() };
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  if (!userId) {
    return { ok: false, message: "Usuário inválido." };
  }

  if (userId === gate.auth.userId) {
    return { ok: false, message: "Você não pode excluir a própria conta." };
  }

  try {
    const admin = createAdminClient();
    const { data: target, error: fetchError } = await admin
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError || !target) {
      console.error("[users:delete:fetch]", fetchError?.message);
      return { ok: false, message: "Não foi possível carregar o usuário." };
    }

    if (isMasterAdminEmail(target.email)) {
      return {
        ok: false,
        message: "O administrador master não pode ser excluído.",
      };
    }

    // audit_logs.actor_id references auth.users without ON DELETE CASCADE,
    // so unlink first to allow the auth user removal.
    const { error: unlinkError } = await admin
      .from("audit_logs")
      .update({ actor_id: null })
      .eq("actor_id", userId);

    if (unlinkError) {
      console.error("[users:delete:unlink-audit]", unlinkError.message);
      return {
        ok: false,
        message:
          "Não foi possível preparar a exclusão (registros de auditoria vinculados).",
      };
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[users:delete]", error.message);
      const msg = error.message.toLowerCase();
      if (msg.includes("foreign key") || msg.includes("violat")) {
        return {
          ok: false,
          message:
            "Não foi possível excluir porque há registros vinculados a este usuário.",
        };
      }
      if (msg.includes("not found") || msg.includes("user not found")) {
        // Profile may be orphaned — remove it directly.
        const { error: profileDeleteError } = await admin
          .from("profiles")
          .delete()
          .eq("id", userId);
        if (profileDeleteError) {
          console.error("[users:delete:profile]", profileDeleteError.message);
          return {
            ok: false,
            message: "Não foi possível excluir o usuário. Tente novamente.",
          };
        }
        revalidatePath("/configuracoes");
        return { ok: true, message: "Usuário excluído com sucesso." };
      }
      return {
        ok: false,
        message: "Não foi possível excluir o usuário. Tente novamente.",
      };
    }

    revalidatePath("/configuracoes");
    return { ok: true, message: "Usuário excluído com sucesso." };
  } catch (err) {
    console.error("[users:delete:unexpected]", err);
    return {
      ok: false,
      message: adminUnavailableMessage(),
    };
  }
}
