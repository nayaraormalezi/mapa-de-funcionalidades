/**
 * Asserts do fluxo Auth (mensagens, redirect de signup, callback next, logs).
 * Executar: npx --yes tsx src/lib/auth-messages.assert.ts
 */
import { safeAuthCallbackNext } from "./auth-callback-path";
import {
  buildSignupEmailRedirectTo,
  friendlyAuthMessage,
  toAuthErrorLogPayload,
  type AuthErrorLike,
} from "./auth-messages";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// A. signup envia emailRedirectTo correto
assert(
  buildSignupEmailRedirectTo("https://prisma.example.com") ===
    "https://prisma.example.com/auth/callback?next=%2F",
  "signup emailRedirectTo com origin de produção",
);
assert(
  buildSignupEmailRedirectTo("https://prisma.example.com/") ===
    "https://prisma.example.com/auth/callback?next=%2F",
  "signup emailRedirectTo sem barra duplicada",
);
assert(
  !buildSignupEmailRedirectTo("https://prisma.example.com").includes(
    "localhost",
  ),
  "signup emailRedirectTo não hardcoda localhost",
);

// B. e-mail não confirmado ≠ senha incorreta
const unconfirmedByCode = friendlyAuthMessage("login", {
  message: "Email not confirmed",
  code: "email_not_confirmed",
  status: 400,
  name: "AuthApiError",
});
assert(
  unconfirmedByCode ===
    "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  "login email_not_confirmed por code",
);
assert(
  !unconfirmedByCode.toLowerCase().includes("senha"),
  "email não confirmado não menciona senha",
);

const unconfirmedByMessageOnly = friendlyAuthMessage("login", {
  message: "Email not confirmed",
  status: 400,
});
assert(
  unconfirmedByMessageOnly.includes("Confirme seu e-mail"),
  "login email not confirmed por message fallback",
);

// Prioriza code mesmo se message parecer genérica
const unconfirmedObfuscated = friendlyAuthMessage("login", {
  message: "Invalid login credentials",
  code: "email_not_confirmed",
  status: 400,
});
assert(
  unconfirmedObfuscated.includes("Confirme seu e-mail"),
  "code email_not_confirmed vence message de credentials",
);

// C. credenciais inválidas
const invalidCreds = friendlyAuthMessage("login", {
  message: "Invalid login credentials",
  code: "invalid_credentials",
  status: 400,
  name: "AuthApiError",
});
assert(
  invalidCreds ===
    "Não foi possível entrar. Verifique seu e-mail e senha e tente novamente.",
  "login invalid_credentials",
);

// Rate limit
const rateLimited = friendlyAuthMessage("login", {
  message: "Request rate limit reached",
  code: "over_request_rate_limit",
  status: 429,
});
assert(
  rateLimited ===
    "Não foi possível entrar agora. Aguarde alguns instantes e tente novamente.",
  "login rate limit",
);

// Outros erros de login ≠ senha incorreta
const otherLogin = friendlyAuthMessage("login", {
  message: "unexpected failure",
  code: "unexpected_failure",
  status: 500,
  name: "AuthApiError",
});
assert(
  otherLogin ===
    "Não foi possível entrar agora. Tente novamente em alguns instantes.",
  "login other error genérico sem sugerir senha",
);
assert(
  !otherLogin.toLowerCase().includes("senha"),
  "erro genérico de login não menciona senha",
);

// D. callback respeita next seguro
assert(safeAuthCallbackNext("/") === "/", "callback next=/");
assert(
  safeAuthCallbackNext("/auth/reset-password") === "/auth/reset-password",
  "callback next reset preservado",
);
assert(safeAuthCallbackNext("/login") === "/login", "callback next login");
assert(safeAuthCallbackNext(null) === "/", "callback sem next → /");
assert(safeAuthCallbackNext(undefined) === "/", "callback undefined → /");
assert(safeAuthCallbackNext("") === "/", "callback next vazio → /");
assert(
  safeAuthCallbackNext("https://evil.example") === "/",
  "callback rejeita URL absoluta",
);
assert(
  safeAuthCallbackNext("//evil.example") === "/",
  "callback rejeita protocol-relative",
);
assert(
  safeAuthCallbackNext("/ok?x=1") === "/ok?x=1",
  "callback permite path relativo com query",
);

// E. reset continua com next explícito (contrato do redirectTo)
const resetRedirect = `https://app.example/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`;
const resetNext = new URL(resetRedirect).searchParams.get("next");
assert(
  safeAuthCallbackNext(resetNext) === "/auth/reset-password",
  "reset password next explícito continua válido",
);

// F. payload de log só com campos seguros
const noisy: AuthErrorLike & Record<string, unknown> = {
  message: "Email not confirmed",
  code: "email_not_confirmed",
  status: 400,
  name: "AuthApiError",
  password: "SuperSecret123!",
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb",
  refresh_token: "refresh-secret",
  cookie: "sb-access-token=leak",
};
const payload = toAuthErrorLogPayload(noisy);
assert(payload.message === "Email not confirmed", "log message");
assert(payload.code === "email_not_confirmed", "log code");
assert(payload.status === 400, "log status");
assert(payload.name === "AuthApiError", "log name");
assert(
  !("password" in payload) &&
    !("access_token" in payload) &&
    !("refresh_token" in payload) &&
    !("cookie" in payload),
  "log sem secrets",
);
const serialized = JSON.stringify(payload);
assert(!serialized.includes("SuperSecret"), "log serializado sem senha");
assert(!serialized.includes("eyJ"), "log serializado sem JWT");
assert(!serialized.includes("refresh-secret"), "log serializado sem refresh");
assert(!serialized.includes("sb-access-token"), "log serializado sem cookie");

console.log("auth-messages.assert: ok");
