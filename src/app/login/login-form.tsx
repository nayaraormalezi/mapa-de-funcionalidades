"use client";

import { useActionState, useId, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  loginAction,
  signupAction,
  requestPasswordResetAction,
  type AuthActionResult,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaixaConsorcioLogo } from "@/components/brand/caixa-consorcio-logo";
import { CORPORATE_EMAIL_DOMAIN } from "@/lib/corporate-email";
import { cn } from "@/lib/utils";

const CORPORATE_EMAIL_PATTERN = `.*@${CORPORATE_EMAIL_DOMAIN.replace(/\./g, "\\.")}`;
const CORPORATE_EMAIL_TITLE =
  "Use um e-mail corporativo @caixaconsorcio.com.br";

const initial: AuthActionResult | null = null;

export function LoginForm({
  nextPath,
  resetLinkError = false,
}: {
  nextPath: string;
  resetLinkError?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initial,
  );
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initial,
  );
  const [resetState, resetFormAction, resetPending] = useActionState(
    requestPasswordResetAction,
    initial,
  );

  const loginErrorId = useId();
  const signupErrorId = useId();
  const resetFeedbackId = useId();
  const busy = loginPending || signupPending || resetPending;

  return (
    <div className="flex min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {/* Institutional panel */}
      <aside className="relative hidden w-[48%] max-w-xl overflow-hidden bg-[var(--brand)] text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-10 xl:px-12">
          <div>
            <CaixaConsorcioLogo className="h-12 w-auto" />
            <p className="mt-10 text-[11px] font-semibold tracking-[0.18em] text-white/70 uppercase">
              Ambiente interno
            </p>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight xl:text-6xl">
              PRISMA
            </h1>
            <p className="mt-3 text-sm font-medium tracking-wide text-white/85">
              UX + CX · CAIXA Consórcio
            </p>
            <p className="mt-8 max-w-sm text-base leading-relaxed text-white/80">
              Visão integrada de funcionalidades, jornadas, canais e experiências
              do Consórcio CAIXA.
            </p>
          </div>

          <p className="relative z-10 text-xs text-white/50">
            PRISMA · Uso interno · CAIXA Consórcio
          </p>
        </div>
      </aside>

      {/* Auth panel */}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-8">
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--brand)]">
              PRISMA
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              UX + CX · CAIXA Consórcio
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
            {resetLinkError && mode === "login" ? (
              <p
                role="alert"
                className="mb-4 rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
              >
                O link de redefinição é inválido ou expirou. Solicite um novo
                abaixo.
              </p>
            ) : null}

            {mode === "login" ? (
              <>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    Entrar
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Acesse o ambiente interno de UX + CX.
                  </p>
                </div>

                <form
                  action={loginFormAction}
                  className="mt-6 space-y-4"
                  noValidate
                >
                  <input type="hidden" name="next" value={nextPath} />

                  <Field id="login-email" label="E-mail corporativo">
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="username"
                      inputMode="email"
                      required
                      disabled={busy}
                      placeholder="nome@caixaconsorcio.com.br"
                      pattern={CORPORATE_EMAIL_PATTERN}
                      title={CORPORATE_EMAIL_TITLE}
                      aria-invalid={
                        loginState && !loginState.ok ? true : undefined
                      }
                      aria-describedby={
                        loginState && !loginState.ok ? loginErrorId : undefined
                      }
                      className="h-10"
                    />
                  </Field>

                  <Field id="login-password" label="Senha">
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        disabled={busy}
                        placeholder="Digite sua senha"
                        aria-invalid={
                          loginState && !loginState.ok ? true : undefined
                        }
                        aria-describedby={
                          loginState && !loginState.ok
                            ? loginErrorId
                            : undefined
                        }
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        aria-label={
                          showPassword ? "Ocultar senha" : "Mostrar senha"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        disabled={busy}
                        className="text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  </Field>

                  {loginState && !loginState.ok ? (
                    <p
                      id={loginErrorId}
                      role="alert"
                      className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
                    >
                      {loginState.message}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-10 w-full"
                    disabled={busy}
                    aria-busy={loginPending}
                  >
                    {loginPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden
                        />
                        Entrando…
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Não possui acesso?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      disabled={busy}
                      className="font-medium text-[var(--brand)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
                    >
                      Solicitar acesso
                    </button>
                  </p>
                </div>
              </>
            ) : mode === "forgot" ? (
              <>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    Esqueci minha senha
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Informe seu e-mail corporativo. Se estiver cadastrado,
                    enviaremos um link para redefinir a senha.
                  </p>
                </div>

                <form
                  action={resetFormAction}
                  className="mt-6 space-y-4"
                  noValidate
                >
                  <Field id="reset-email" label="E-mail corporativo">
                    <Input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      disabled={busy}
                      placeholder="nome@caixaconsorcio.com.br"
                      pattern={CORPORATE_EMAIL_PATTERN}
                      title={CORPORATE_EMAIL_TITLE}
                      aria-invalid={
                        resetState && !resetState.ok ? true : undefined
                      }
                      aria-describedby={
                        resetState ? resetFeedbackId : undefined
                      }
                      className="h-10"
                    />
                  </Field>

                  {resetState ? (
                    <p
                      id={resetFeedbackId}
                      role="status"
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm",
                        resetState.ok
                          ? "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]"
                          : "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
                      )}
                    >
                      {resetState.message}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-10 w-full"
                    disabled={busy}
                    aria-busy={resetPending}
                  >
                    {resetPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden
                        />
                        Enviando…
                      </>
                    ) : (
                      "Enviar link de redefinição"
                    )}
                  </Button>
                </form>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    disabled={busy}
                    className="text-sm font-medium text-[var(--brand)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
                  >
                    ← Voltar para entrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    Solicitar acesso
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Crie sua conta para acessar o PRISMA.
                  </p>
                </div>

                <form
                  action={signupFormAction}
                  className="mt-6 space-y-4"
                  noValidate
                >
                  <Field id="signup-name" label="Nome">
                    <Input
                      id="signup-name"
                      name="full_name"
                      type="text"
                      autoComplete="name"
                      disabled={busy}
                      placeholder="Seu nome"
                      className="h-10"
                    />
                  </Field>

                  <Field id="signup-email" label="E-mail corporativo">
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      disabled={busy}
                      placeholder="nome@caixaconsorcio.com.br"
                      pattern={CORPORATE_EMAIL_PATTERN}
                      title={CORPORATE_EMAIL_TITLE}
                      aria-invalid={
                        signupState && !signupState.ok ? true : undefined
                      }
                      aria-describedby={
                        signupState ? signupErrorId : undefined
                      }
                      className="h-10"
                    />
                  </Field>

                  <Field
                    id="signup-password"
                    label="Senha"
                    hint="Mínimo de 8 caracteres."
                  >
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showSignupPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        disabled={busy}
                        placeholder="Digite sua senha"
                        aria-invalid={
                          signupState && !signupState.ok ? true : undefined
                        }
                        aria-describedby={
                          signupState ? signupErrorId : undefined
                        }
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((v) => !v)}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        aria-label={
                          showSignupPassword
                            ? "Ocultar senha"
                            : "Mostrar senha"
                        }
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                  </Field>

                  {signupState ? (
                    <p
                      id={signupErrorId}
                      role="status"
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm",
                        signupState.ok
                          ? "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]"
                          : "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
                      )}
                    >
                      {signupState.message}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-10 w-full"
                    disabled={busy}
                    aria-busy={signupPending}
                  >
                    {signupPending ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden
                        />
                        Criando…
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </Button>
                </form>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    disabled={busy}
                    className="text-sm font-medium text-[var(--brand)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
                  >
                    ← Voltar para entrar
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-[var(--muted-foreground)] lg:hidden">
            PRISMA · Uso interno · CAIXA Consórcio
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
