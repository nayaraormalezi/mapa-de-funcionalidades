/**
 * Mensagens amigáveis + logging seguro de erros Auth (Supabase).
 * Sem senha, tokens, cookies ou secrets nos logs.
 */

export type AuthActionContext =
  | "login"
  | "signup"
  | "reset"
  | "update-password"
  | "change-password"
  | "callback";

/** Campos seguros do AuthError do Supabase (e similares). */
export type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

export type AuthErrorLogPayload = {
  message: string | null;
  code: string | null;
  status: number | null;
  name: string | null;
};

/** Monta payload de log sem campos sensíveis. */
export function toAuthErrorLogPayload(
  error: AuthErrorLike,
): AuthErrorLogPayload {
  return {
    message: error.message ?? null,
    code: error.code ?? null,
    status: typeof error.status === "number" ? error.status : null,
    name: error.name ?? null,
  };
}

export function logAuthError(
  context: AuthActionContext,
  error: AuthErrorLike,
): void {
  console.error(`[auth:${context}]`, toAuthErrorLogPayload(error));
}

/** Redirect de confirmação de cadastro → callback da app. */
export function buildSignupEmailRedirectTo(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent("/")}`;
}

/**
 * Prioriza error.code/status; message só como fallback.
 * Login: não assume que qualquer erro é senha incorreta.
 */
export function friendlyAuthMessage(
  context: AuthActionContext,
  error: AuthErrorLike | string,
): string {
  const normalized: AuthErrorLike =
    typeof error === "string" ? { message: error } : error;

  logAuthError(context, normalized);

  const code = String(normalized.code ?? "")
    .trim()
    .toLowerCase();
  const msg = String(normalized.message ?? "")
    .trim()
    .toLowerCase();
  const status = normalized.status;

  // 1) E-mail não confirmado
  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }

  // 2) Credenciais inválidas
  if (
    code === "invalid_credentials" ||
    code === "invalid_login_credentials" ||
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid email or password")
  ) {
    if (context === "change-password") {
      return "A senha atual está incorreta.";
    }
    return "Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.";
  }

  // 3) Rate limit
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "too_many_requests" ||
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("too_many")
  ) {
    if (context === "change-password") {
      return "Não foi possível alterar sua senha. Aguarde alguns instantes e tente novamente.";
    }
    return "Não foi possível entrar agora. Aguarde alguns instantes e tente novamente.";
  }

  // Signup: e-mail já registrado
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already registered")
  ) {
    return "Este e-mail já possui acesso. Tente entrar ou recupere o acesso com o administrador.";
  }

  if (
    (msg.includes("password") && msg.includes("least")) ||
    code === "weak_password"
  ) {
    if (context === "change-password") {
      return "A nova senha não atende aos requisitos de segurança.";
    }
    return "A senha deve ter pelo menos 8 caracteres.";
  }

  if (
    msg.includes("same password") ||
    msg.includes("different from the old") ||
    code === "same_password"
  ) {
    return "Escolha uma senha diferente da senha atual.";
  }

  // Sessão / usuário não autenticado
  if (
    context === "change-password" &&
    (code === "session_not_found" ||
      code === "user_not_found" ||
      status === 401 ||
      msg.includes("session") ||
      msg.includes("not authenticated") ||
      msg.includes("jwt"))
  ) {
    return "Sua sessão expirou. Entre novamente para alterar a senha.";
  }

  // 4) Outros erros — NÃO tratar como senha incorreta
  if (context === "login") {
    return "Não foi possível entrar agora. Tente novamente em alguns instantes.";
  }

  if (context === "reset") {
    return "Não foi possível enviar o link de redefinição. Tente novamente em instantes.";
  }

  if (context === "update-password") {
    return "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.";
  }

  if (context === "change-password") {
    return "Não foi possível alterar sua senha. Tente novamente.";
  }

  if (context === "callback") {
    return "Não foi possível concluir a autenticação. Tente novamente.";
  }

  return "Não foi possível criar o acesso agora. Tente novamente em instantes.";
}
