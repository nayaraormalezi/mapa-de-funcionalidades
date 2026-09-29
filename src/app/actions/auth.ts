"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  buildSignupEmailRedirectTo,
  friendlyAuthMessage,
} from "@/lib/auth-messages";
import { validateCorporateEmail } from "@/lib/corporate-email";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";

export type AuthActionResult = {
  ok: boolean;
  message: string;
};

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

export async function loginAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Autenticação indisponível no momento. Tente novamente mais tarde.",
    };
  }

  const emailRaw = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";

  if (!emailRaw.trim() || !password) {
    return { ok: false, message: "Informe e-mail e senha para continuar." };
  }

  const emailCheck = validateCorporateEmail(emailRaw);
  if (!emailCheck.ok) {
    return { ok: false, message: emailCheck.message };
  }
  const email = emailCheck.email;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      message: friendlyAuthMessage("login", {
        message: error.message,
        code: error.code,
        status: error.status,
        name: error.name,
      }),
    };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

export async function signupAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Autenticação indisponível no momento. Tente novamente mais tarde.",
    };
  }

  const emailRaw = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!emailRaw.trim() || !password) {
    return { ok: false, message: "Informe e-mail e senha para continuar." };
  }

  const emailCheck = validateCorporateEmail(emailRaw);
  if (!emailCheck.ok) {
    return { ok: false, message: emailCheck.message };
  }
  const email = emailCheck.email;

  if (password.length < 8) {
    return { ok: false, message: "A senha deve ter pelo menos 8 caracteres." };
  }

  const origin = await getSiteOrigin();
  const emailRedirectTo = buildSignupEmailRedirectTo(origin);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split("@")[0] },
      emailRedirectTo,
    },
  });

  if (error) {
    return {
      ok: false,
      message: friendlyAuthMessage("signup", {
        message: error.message,
        code: error.code,
        status: error.status,
        name: error.name,
      }),
    };
  }

  if (!data.session) {
    return {
      ok: true,
      message:
        "Conta criada. Se a confirmação de e-mail estiver ativa, confirme antes de entrar.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Autenticação indisponível no momento. Tente novamente mais tarde.",
    };
  }

  const emailRaw = String(formData.get("email") ?? "");

  const emailCheck = validateCorporateEmail(emailRaw);
  if (!emailCheck.ok) {
    return { ok: false, message: emailCheck.message };
  }
  const email = emailCheck.email;

  const origin = await getSiteOrigin();
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      ok: false,
      message: friendlyAuthMessage("reset", {
        message: error.message,
        code: error.code,
        status: error.status,
        name: error.name,
      }),
    };
  }

  return {
    ok: true,
    message:
      "Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Verifique sua caixa de entrada.",
  };
}

export async function updatePasswordAction(
  _prev: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  if (!isSupabaseEnabled()) {
    return {
      ok: false,
      message:
        "Autenticação indisponível no momento. Tente novamente mais tarde.",
    };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!password || password.length < 8) {
    return { ok: false, message: "A senha deve ter pelo menos 8 caracteres." };
  }

  if (password !== confirm) {
    return { ok: false, message: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message:
        "Link inválido ou expirado. Solicite uma nova redefinição de senha.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      ok: false,
      message: friendlyAuthMessage("update-password", {
        message: error.message,
        code: error.code,
        status: error.status,
        name: error.name,
      }),
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  if (!isSupabaseEnabled()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
