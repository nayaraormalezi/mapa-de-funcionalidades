"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type AudienceOption = { id: string; name: string };

/**
 * Multi-seleção de públicos (aplicabilidade).
 * Envia `audience_ids` como CSV no form.
 */
export function AudienceMultiSelect({
  name = "audience_ids",
  label = "Públicos",
  options,
  defaultSelected,
  selected: controlledSelected,
  onChange,
  required = false,
  hint = "Selecione um ou mais públicos aos quais esta necessidade se aplica.",
  className,
}: {
  name?: string;
  label?: string;
  options: AudienceOption[];
  /** IDs pré-selecionados. `undefined` / vazio = todos marcados. */
  defaultSelected?: string[] | null;
  /** Modo controlado (opcional). */
  selected?: string[];
  onChange?: (ids: string[]) => void;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  const allIds = options.map((o) => o.id);
  const initial =
    defaultSelected && defaultSelected.length > 0
      ? defaultSelected.filter((id) => allIds.includes(id))
      : allIds;

  const [uncontrolled, setUncontrolled] = useState<string[]>(
    initial.length > 0 ? initial : allIds,
  );

  const selected = controlledSelected ?? uncontrolled;

  function toggle(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    if (controlledSelected === undefined) setUncontrolled(next);
    onChange?.(next);
  }

  return (
    <fieldset className={cn("space-y-2", className)}>
      <legend className="text-xs font-semibold tracking-wide text-[var(--muted-foreground)] uppercase">
        {label}
        {required ? " *" : ""}
      </legend>
      {hint ? (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                active
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                  : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600",
              )}
            >
              {active ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              {opt.name}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={selected.join(",")} readOnly />
    </fieldset>
  );
}
