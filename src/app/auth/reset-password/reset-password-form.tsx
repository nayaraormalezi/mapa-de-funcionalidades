"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import {
  updatePasswordAction,
  type AuthActionResult,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaixaConsorcioLogo } from "@/components/brand/caixa-consorcio-logo";

const initial: AuthActionResult | null = null;

export function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initial,
  );
  const errorId = useId();

  return (
    <div className="flex min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
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
              Redefina sua senha para continuar acessando o ambiente interno de
              UX + CX.
            </p>
          </div>
          <p className="text-xs text-white/50">
            PRISMA · Uso interno · CAIXA Consórcio
          </p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-8">
          <div className="mb-8 lg:hidden">
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--brand)]">
              PRISMA
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              UX + CX · CAIXA Consórcio
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-md)] sm:p-8">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                Redefinir senha
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Escolha uma nova senha para sua conta.
              </p>
            </div>

            <form action={formAction} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-slate-800"
                >
                  Nova senha
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={pending}
                    placeholder="Mínimo de 8 caracteres"
                    aria-invalid={state && !state.ok ? true : undefined}
                    aria-describedby={state && !state.ok ? errorId : undefined}
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
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-slate-800"
                >
                  Confirmar nova senha
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    name="confirm_password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={pending}
                    placeholder="Repita a nova senha"
                    aria-invalid={state && !state.ok ? true : undefined}
                    aria-describedby={state && !state.ok ? errorId : undefined}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label={
                      showConfirm ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {state && !state.ok ? (
                <p
                  id={errorId}
                  role="alert"
                  className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
                >
                  {state.message}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Salvando…
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>
            </form>

            <div className="mt-6 border-t border-[var(--border)] pt-5">
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--brand)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                ← Voltar para entrar
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
