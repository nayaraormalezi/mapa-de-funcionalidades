"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import { validateCorporateEmail } from "@/lib/corporate-email";

export type AuthActionResult = {
  ok: boolean;
  message: string;
};

function friendlyAuthMessage(
  context: "login" | "signup" | "reset" | "update-password",
  technicalMessage: string,
): string {
  console.error(`[auth:${context}]`, technicalMessage);
  const msg = technicalMessage.toLowerCase();

  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid email or password") ||
    msg.includes("email not confirmed")
  ) {
    if (msg.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    }
    return "Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.";
  }

  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already registered")
  ) {
    return "Este e-mail já possui acesso. Tente entrar ou recupere o acesso com o administrador.";
  }

  if (msg.includes("password") && msg.includes("least")) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }

  if (msg.includes("same password") || msg.includes("different from the old")) {
    return "Escolha uma senha diferente da atual.";
  }

  if (msg.includes("rate") || msg.includes("too many")) {
    return "Muitas tentativas em pouco tempo. Aguarde um momento e tente novamente.";
  }

  if (context === "login") {
    return "Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.";
  }

  if (context === "reset") {
    return "Não foi possível enviar o link de redefinição. Tente novamente em instantes.";
  }

  if (context === "update-password") {
    return "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.";
  }

  return "Não foi possível criar o acesso agora. Tente novamente em instantes.";
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
    return { ok: false, message: friendlyAuthMessage("login", error.message) };
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

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || email.split("@")[0] },
    },
  });

  if (error) {
    return { ok: false, message: friendlyAuthMessage("signup", error.message) };
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
    return { ok: false, message: friendlyAuthMessage("reset", error.message) };
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
      message: friendlyAuthMessage("update-password", error.message),
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
