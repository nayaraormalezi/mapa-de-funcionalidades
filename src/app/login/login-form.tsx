"use client";

import { useActionState } from "react";
import {
  loginAction,
  signupAction,
  type AuthActionResult,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: AuthActionResult | null = null;

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [loginState, loginFormAction, loginPending] = useActionState(
    loginAction,
    initial,
  );
  const [signupState, signupFormAction, signupPending] = useActionState(
    signupAction,
    initial,
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-4 py-10">
      <div className="space-y-2 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--brand)]">
          Mapa de Funcionalidades
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Acesso interno · CAIXA Consórcio · UX + CX
        </p>
      </div>

      <form
        action={loginFormAction}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold">Entrar</h1>
        <input type="hidden" name="next" value={nextPath} />
        <label className="block space-y-1.5 text-sm">
          <span>E-mail</span>
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Senha</span>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {loginState && !loginState.ok ? (
          <p className="text-sm text-red-600">{loginState.message}</p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loginPending}>
          {loginPending ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <form
        action={signupFormAction}
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Criar conta</h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          O primeiro usuário cadastrado recebe papel Admin. Demais iniciam como
          Viewer.
        </p>
        <label className="block space-y-1.5 text-sm">
          <span>Nome</span>
          <Input name="full_name" type="text" autoComplete="name" />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>E-mail</span>
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span>Senha (mín. 8)</span>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        {signupState ? (
          <p
            className={
              signupState.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"
            }
          >
            {signupState.message}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={signupPending}
        >
          {signupPending ? "Criando…" : "Criar conta"}
        </Button>
      </form>
    </div>
  );
}
