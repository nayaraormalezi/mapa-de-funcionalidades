"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validateChangePasswordInput } from "@/lib/change-password";
import { cn } from "@/lib/utils";

type FieldKey = "currentPassword" | "newPassword" | "confirmPassword";

function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  autoComplete,
  disabled,
  show,
  onToggleShow,
  error,
  describedBy,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
  show: boolean;
  onToggleShow: () => void;
  error?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-10 pr-10"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          disabled={disabled}
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordPanel() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const feedbackId = useId();
  const currentId = useId();
  const newId = useId();
  const confirmId = useId();

  function clearFeedback() {
    setFeedback(null);
    setErrorField(null);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    clearFeedback();

    const validation = validateChangePasswordInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.ok) {
      setErrorField(validation.field ?? null);
      setFeedback({ ok: false, message: validation.message });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("current_password", currentPassword);
      formData.set("new_password", newPassword);
      formData.set("confirm_password", confirmPassword);

      const result = await changePasswordAction(null, formData);

      if (result.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setErrorField(null);
        setFeedback({ ok: true, message: result.message });
        return;
      }

      let field: FieldKey | null = null;
      const msg = result.message.toLowerCase();
      if (msg.includes("senha atual")) field = "currentPassword";
      else if (msg.includes("não coincidem") || msg.includes("confirme"))
        field = "confirmPassword";
      else if (
        msg.includes("nova senha") ||
        msg.includes("requisitos") ||
        msg.includes("diferente")
      )
        field = "newPassword";

      setErrorField(field);
      setFeedback({ ok: false, message: result.message });
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] px-4 py-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">Alterar senha</h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          Atualize sua senha para manter sua conta protegida.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <PasswordField
          id={currentId}
          label="Senha atual"
          name="current_password"
          value={currentPassword}
          onChange={(v) => {
            setCurrentPassword(v);
            clearFeedback();
          }}
          autoComplete="current-password"
          disabled={pending}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
          error={errorField === "currentPassword"}
          describedBy={
            errorField === "currentPassword" && feedback && !feedback.ok
              ? feedbackId
              : undefined
          }
        />

        <PasswordField
          id={newId}
          label="Nova senha"
          name="new_password"
          value={newPassword}
          onChange={(v) => {
            setNewPassword(v);
            clearFeedback();
          }}
          autoComplete="new-password"
          disabled={pending}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
          error={errorField === "newPassword"}
          describedBy={
            errorField === "newPassword" && feedback && !feedback.ok
              ? feedbackId
              : undefined
          }
        />

        <PasswordField
          id={confirmId}
          label="Confirmar nova senha"
          name="confirm_password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            clearFeedback();
          }}
          autoComplete="new-password"
          disabled={pending}
          show={showConfirm}
          onToggleShow={() => setShowConfirm((v) => !v)}
          error={errorField === "confirmPassword"}
          describedBy={
            errorField === "confirmPassword" && feedback && !feedback.ok
              ? feedbackId
              : undefined
          }
        />

        {feedback ? (
          <p
            id={feedbackId}
            role={feedback.ok ? "status" : "alert"}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              feedback.ok
                ? "border-[var(--success-soft)] bg-[var(--success-soft)] text-[var(--success)]"
                : "border-[var(--danger-soft)] bg-[var(--danger-soft)] text-[var(--danger)]",
            )}
          >
            {feedback.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            className="h-10 min-w-[140px]"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Alterando senha...
              </>
            ) : (
              "Alterar senha"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
