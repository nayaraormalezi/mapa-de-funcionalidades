"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/crud";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";

export function CrudForm({
  action,
  children,
  submitLabel = "Salvar",
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  submitLabel?: string;
  onSuccess?: (result: ActionResult) => void;
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
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
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
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
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
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: string;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
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
          className={`h-9 ${className}`}
        />
      )}
    </label>
  );
}
