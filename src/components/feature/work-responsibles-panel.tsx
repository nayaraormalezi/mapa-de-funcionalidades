"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Loader2, Plus, UserRound } from "lucide-react";
import {
  addEvolutionResponsible,
  addFccResponsible,
  removeEvolutionResponsible,
  removeFccResponsible,
  searchWorkResponsibleUsers,
  type ProfileSearchHit,
} from "@/app/actions/work-responsibles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  displayWorkResponsibleKind,
  WORK_RESPONSIBLE_NAME_MAX,
  validateWorkResponsibleInput,
} from "@/lib/work-responsibles";
import { cn } from "@/lib/utils";
import type { WorkResponsible } from "@/types";

type KindUi = "REGISTERED_USER" | "MANUAL";

type Owner =
  | { kind: "FCC"; featureChannelContextId: string }
  | { kind: "EVOLUTION"; featureEvolutionId: string };

function AddResponsibleForm({
  owner,
  existing,
  onCancel,
  onAdded,
}: {
  owner: Owner;
  existing: WorkResponsible[];
  onCancel: () => void;
  onAdded: (item: WorkResponsible) => void;
}) {
  const [kind, setKind] = useState<KindUi>("REGISTERED_USER");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProfileSearchHit[]>([]);
  const [selected, setSelected] = useState<ProfileSearchHit | null>(null);
  const [manualName, setManualName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [pending, startTransition] = useTransition();
  const errorId = useId();
  const userInputId = useId();
  const manualInputId = useId();

  useEffect(() => {
    if (kind !== "REGISTERED_USER") return;
    if (selected && query === selected.fullName) return;
    const q = query.trim();
    if (q.length < 1) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      startSearch(async () => {
        const result = await searchWorkResponsibleUsers(q);
        if ("users" in result && result.ok) {
          const taken = new Set(
            existing
              .filter((p) => p.kind === "REGISTERED_USER" && p.userId)
              .map((p) => p.userId!),
          );
          setHits(result.users.filter((u) => !taken.has(u.id)));
        }
      });
    }, 220);
    return () => clearTimeout(handle);
  }, [query, kind, selected, existing]);

  function submit() {
    setError(null);
    if (kind === "REGISTERED_USER") {
      if (!selected) {
        setError("Selecione um usuário cadastrado.");
        return;
      }
      const validated = validateWorkResponsibleInput({
        kind: "REGISTERED_USER",
        userId: selected.id,
      });
      if (!validated.ok) {
        setError(validated.message);
        return;
      }
      startTransition(async () => {
        const result =
          owner.kind === "FCC"
            ? await addFccResponsible({
                featureChannelContextId: owner.featureChannelContextId,
                kind: "REGISTERED_USER",
                userId: selected.id,
              })
            : await addEvolutionResponsible({
                featureEvolutionId: owner.featureEvolutionId,
                kind: "REGISTERED_USER",
                userId: selected.id,
              });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        if (result.responsible) onAdded(result.responsible);
        else {
          onAdded({
            id: result.id ?? `tmp-${Date.now()}`,
            ownerKind: owner.kind,
            ownerId:
              owner.kind === "FCC"
                ? owner.featureChannelContextId
                : owner.featureEvolutionId,
            kind: "REGISTERED_USER",
            userId: selected.id,
            responsibleName: null,
            displayName: selected.fullName,
            email: selected.email,
            createdBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });
      return;
    }

    const validated = validateWorkResponsibleInput({
      kind: "MANUAL",
      responsibleName: manualName,
    });
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    startTransition(async () => {
      const result =
        owner.kind === "FCC"
          ? await addFccResponsible({
              featureChannelContextId: owner.featureChannelContextId,
              kind: "MANUAL",
              responsibleName: validated.responsibleName ?? manualName.trim(),
            })
          : await addEvolutionResponsible({
              featureEvolutionId: owner.featureEvolutionId,
              kind: "MANUAL",
              responsibleName: validated.responsibleName ?? manualName.trim(),
            });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.responsible) onAdded(result.responsible);
      else {
        onAdded({
          id: result.id ?? `tmp-${Date.now()}`,
          ownerKind: owner.kind,
          ownerId:
            owner.kind === "FCC"
              ? owner.featureChannelContextId
              : owner.featureEvolutionId,
          kind: "MANUAL",
          userId: null,
          responsibleName: validated.responsibleName,
          displayName: validated.responsibleName ?? manualName.trim(),
          email: null,
          createdBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-slate-50/80 p-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: "REGISTERED_USER" as const, label: "Usuário cadastrado" },
            { value: "MANUAL" as const, label: "Responsável manual" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setKind(opt.value);
              setError(null);
              setSelected(null);
              setQuery("");
              setHits([]);
              setManualName("");
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              kind === opt.value
                ? "border-[var(--brand)] bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                : "border-[var(--border)] bg-white text-slate-600",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {kind === "REGISTERED_USER" ? (
        <div className="relative">
          <label
            htmlFor={userInputId}
            className="text-xs font-medium text-slate-600"
          >
            Buscar usuário
          </label>
          <Input
            id={userInputId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Buscar responsável..."
            className="mt-1"
            autoComplete="off"
          />
          {searching ? (
            <p className="mt-1 text-[11px] text-slate-400">Buscando…</p>
          ) : null}
          {hits.length > 0 && !selected ? (
            <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-[var(--border)] bg-white shadow-md">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => {
                      setSelected(hit);
                      setQuery(hit.fullName);
                      setHits([]);
                    }}
                  >
                    <span className="font-medium text-slate-800">
                      {hit.fullName}
                    </span>
                    {hit.email ? (
                      <span className="text-[11px] text-slate-500">
                        {hit.email}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div>
          <label
            htmlFor={manualInputId}
            className="text-xs font-medium text-slate-600"
          >
            Nome do responsável
          </label>
          <Input
            id={manualInputId}
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Ex.: Time de Desenvolvimento"
            maxLength={WORK_RESPONSIBLE_NAME_MAX}
            className="mt-1"
          />
        </div>
      )}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Salvando…
            </>
          ) : (
            "Adicionar"
          )}
        </Button>
      </div>
    </div>
  );
}

export function WorkResponsiblesPanel({
  owner,
  initialResponsibles,
  canEdit,
  compact = false,
}: {
  owner: Owner;
  initialResponsibles: WorkResponsible[];
  canEdit: boolean;
  /** Versão enxuta para footer de cards. */
  compact?: boolean;
}) {
  const [items, setItems] = useState(initialResponsibles);
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<WorkResponsible | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialResponsibles);
  }, [initialResponsibles]);

  const title = items.length === 1 ? "Responsável" : "Responsáveis";

  return (
    <div className={cn(!compact && "space-y-3")}>
      {!compact ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-800 uppercase">
              {title}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Indique quem está responsável pela execução ou acompanhamento
              desta funcionalidade.
            </p>
          </div>
          {canEdit && !adding ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-600">{title}</p>
          {canEdit && !adding ? (
            <button
              type="button"
              className="text-[11px] font-medium text-[var(--brand)] hover:underline"
              onClick={() => setAdding(true)}
            >
              Adicionar
            </button>
          ) : null}
        </div>
      )}

      {items.length === 0 && !adding ? (
        <p
          className={cn(
            "text-xs text-slate-500",
            !compact &&
              "rounded-xl border border-dashed border-[var(--border)] px-3 py-4 text-center",
          )}
        >
          Nenhum responsável indicado.
        </p>
      ) : (
        <ul className={cn("space-y-1.5", !compact && "mt-1")}>
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5"
            >
              <div className="min-w-0 flex items-center gap-2">
                <UserRound
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {item.displayName}
                  </p>
                  {!compact ? (
                    <p className="truncate text-[11px] text-slate-500">
                      {displayWorkResponsibleKind(item.kind)}
                      {item.email ? ` · ${item.email}` : null}
                    </p>
                  ) : null}
                </div>
              </div>
              {canEdit ? (
                <ActionMenu
                  items={[
                    {
                      label: "Remover",
                      tone: "danger",
                      onSelect: () => setPendingRemove(item),
                    },
                  ]}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="mt-2">
          <AddResponsibleForm
            owner={owner}
            existing={items}
            onCancel={() => setAdding(false)}
            onAdded={(item) => {
              setItems((prev) => [...prev, item]);
              setAdding(false);
            }}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remover responsável?"
        description={
          pendingRemove
            ? `Remover "${pendingRemove.displayName}" desta unidade de trabalho?`
            : ""
        }
        confirmLabel={pending ? "Removendo…" : "Remover"}
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => {
          if (!pending) setPendingRemove(null);
        }}
        onConfirm={() => {
          if (!pendingRemove) return;
          startTransition(async () => {
            const result =
              owner.kind === "FCC"
                ? await removeFccResponsible({
                    id: pendingRemove.id,
                    featureChannelContextId: owner.featureChannelContextId,
                  })
                : await removeEvolutionResponsible({
                    id: pendingRemove.id,
                    featureEvolutionId: owner.featureEvolutionId,
                  });
            if (!result.ok) {
              alert(result.message);
              return;
            }
            setItems((prev) =>
              prev.filter((p) => p.id !== pendingRemove.id),
            );
            setPendingRemove(null);
          });
        }}
      />
    </div>
  );
}
