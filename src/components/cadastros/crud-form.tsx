"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/crud";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CrudForm({
  action,
  children,
  submitLabel = "Salvar",
  onSuccess,
  onBeforeSubmit,
  className,
  bodyClassName,
  actionsClassName,
  extraActions,
  formRef,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  onSuccess?: (result: ActionResult) => void;
  /** Retorne `false` para cancelar o envio (ex.: abrir confirmação). */
  onBeforeSubmit?: (formData: FormData) => boolean | Promise<boolean>;
  className?: string;
  bodyClassName?: string;
  actionsClassName?: string;
  extraActions?: React.ReactNode;
  formRef?: React.RefObject<HTMLFormElement | null>;
}) {
  const router = useRouter();
  const { canEdit } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Seu perfil é somente leitura (Viewer). Alterações exigem Admin ou Editor.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className={cn("space-y-4", className)}
      action={(formData) => {
        startTransition(async () => {
          if (onBeforeSubmit) {
            const allow = await onBeforeSubmit(formData);
            if (!allow) return;
          }
          const result = await action(formData);
          setOk(result.ok);
          setMessage(result.message);
          if (result.ok) {
            router.refresh();
            onSuccess?.(result);
          }
        });
      }}
    >
      {bodyClassName ? (
        <div className={bodyClassName}>{children}</div>
      ) : (
        children
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          actionsClassName,
        )}
      >
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        {extraActions}
        {message ? (
          <p
            className={`text-sm ${ok ? "text-emerald-700" : "text-rose-700"}`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  as = "input",
  options,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  hint?: string;
  placeholder?: string;
}) {
  const className =
    "mt-1 flex w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm";

  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
        {required ? " *" : ""}
      </span>
      {as === "textarea" ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className={`${className} min-h-24`}
        />
      ) : as === "select" ? (
        <select
          name={name}
          required={required}
          defaultValue={defaultValue ?? ""}
          className={className}
        >
          <option value="">Selecione…</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className={`h-9 ${className}`}
        />
      )}
      {hint ? (
        <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-[var(--muted-foreground)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
