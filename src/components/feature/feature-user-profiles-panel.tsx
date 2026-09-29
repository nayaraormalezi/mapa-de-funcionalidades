"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Loader2, Plus, UserRound } from "lucide-react";
import {
  addFeatureUserProfile,
  removeFeatureUserProfile,
  searchFeatureProfileUsers,
  type ProfileSearchHit,
} from "@/app/actions/feature-user-profiles";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  displayFeatureUserProfileKind,
  FEATURE_USER_PROFILE_NAME_MAX,
  validateFeatureUserProfileInput,
} from "@/lib/feature-user-profiles";
import { cn } from "@/lib/utils";
import type { FeatureUserProfile } from "@/types";

type KindUi = "REGISTERED_USER" | "MANUAL_PROFILE";

function AddProfileForm({
  featureId,
  existing,
  onCancel,
  onAdded,
}: {
  featureId: string;
  existing: FeatureUserProfile[];
  onCancel: () => void;
  onAdded: (profile: FeatureUserProfile) => void;
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
        const result = await searchFeatureProfileUsers(q);
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
      const validated = validateFeatureUserProfileInput({
        kind: "REGISTERED_USER",
        userId: selected.id,
      });
      if (!validated.ok) {
        setError(validated.message);
        return;
      }
      startTransition(async () => {
        const result = await addFeatureUserProfile({
          featureId,
          kind: "REGISTERED_USER",
          userId: selected.id,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        onAdded({
          id: result.id ?? `tmp-${selected.id}`,
          featureId,
          kind: "REGISTERED_USER",
          userId: selected.id,
          profileName: null,
          displayName: selected.fullName,
          email: selected.email,
          createdBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      return;
    }

    const validated = validateFeatureUserProfileInput({
      kind: "MANUAL_PROFILE",
      profileName: manualName,
    });
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    startTransition(async () => {
      const result = await addFeatureUserProfile({
        featureId,
        kind: "MANUAL_PROFILE",
        profileName: validated.profileName!,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onAdded({
        id: result.id ?? `tmp-${Date.now()}`,
        featureId,
        kind: "MANUAL_PROFILE",
        userId: null,
        profileName: validated.profileName,
        displayName: validated.profileName!,
        email: null,
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-slate-50/80 p-4">
      <p className="text-sm font-medium text-slate-900">Tipo de perfil</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {(
          [
            ["REGISTERED_USER", "Usuário cadastrado"],
            ["MANUAL_PROFILE", "Perfil manual"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="inline-flex items-center gap-2 text-sm text-slate-700"
          >
            <input
              type="radio"
              name="profile-kind"
              checked={kind === value}
              onChange={() => {
                setKind(value);
                setError(null);
                setSelected(null);
                setQuery("");
                setHits([]);
                setManualName("");
              }}
              disabled={pending}
            />
            {label}
          </label>
        ))}
      </div>

      {kind === "REGISTERED_USER" ? (
        <div className="relative mt-4 space-y-1.5">
          <label
            htmlFor={userInputId}
            className="block text-sm font-medium text-slate-800"
          >
            Usuário
          </label>
          <Input
            id={userInputId}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setError(null);
            }}
            placeholder="Buscar usuário..."
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            autoComplete="off"
            className="h-10"
          />
          {searching ? (
            <p className="text-xs text-slate-500">Buscando…</p>
          ) : null}
          {hits.length > 0 && !selected ? (
            <ul
              className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--border)] bg-white shadow-md"
              role="listbox"
            >
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-50"
                    onClick={() => {
                      setSelected(hit);
                      setQuery(hit.fullName);
                      setHits([]);
                    }}
                  >
                    <span className="text-sm font-medium text-slate-900">
                      {hit.fullName}
                    </span>
                    <span className="text-xs text-slate-500">{hit.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selected ? (
            <p className="text-xs text-slate-500">
              Selecionado: {selected.fullName} · {selected.email}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 space-y-1.5">
          <label
            htmlFor={manualInputId}
            className="block text-sm font-medium text-slate-800"
          >
            Nome do perfil
          </label>
          <Input
            id={manualInputId}
            value={manualName}
            onChange={(e) => {
              setManualName(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: Cliente contemplado"
            maxLength={FEATURE_USER_PROFILE_NAME_MAX}
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-10"
          />
        </div>
      )}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-3 rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Adicionando…
            </>
          ) : (
            "Adicionar"
          )}
        </Button>
      </div>
    </div>
  );
}

export function FeatureUserProfilesPanel({
  featureId,
  initialProfiles,
  canEdit,
  compact = false,
}: {
  featureId: string;
  initialProfiles: FeatureUserProfile[];
  canEdit: boolean;
  /** Versão compacta para preview/listagens. */
  compact?: boolean;
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<FeatureUserProfile | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  return (
    <section
      className={cn(
        "rounded-xl border border-[var(--border)] bg-white",
        compact ? "p-3" : "p-4 sm:p-5",
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            className={cn(
              "font-semibold text-slate-900",
              compact ? "text-sm" : "text-xs tracking-[0.14em] text-slate-400 uppercase",
            )}
          >
            Perfil de usuário
          </h2>
          {!compact ? (
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Indique para quem esta funcionalidade é destinada ou quem participa
              desta experiência.
            </p>
          ) : null}
        </div>
        {canEdit && !adding ? (
          <Button
            type="button"
            variant={compact ? "ghost" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setFeedback(null);
              setAdding(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar perfil
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-3">
          <AddProfileForm
            featureId={featureId}
            existing={profiles}
            onCancel={() => setAdding(false)}
            onAdded={(profile) => {
              setProfiles((prev) => [...prev, profile]);
              setAdding(false);
              setFeedback(null);
            }}
          />
        </div>
      ) : null}

      {profiles.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--muted-foreground)]">
          Nenhum perfil de usuário associado.
        </p>
      ) : (
        <ul className="space-y-2">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <UserRound className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {profile.displayName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {profile.kind === "REGISTERED_USER" && profile.email
                      ? `${profile.email} · ${displayFeatureUserProfileKind(profile.kind)}`
                      : displayFeatureUserProfileKind(profile.kind)}
                  </p>
                </div>
              </div>
              {canEdit ? (
                <ActionMenu
                  items={[
                    {
                      label: "Remover",
                      onSelect: () => setPendingRemove(profile),
                      tone: "danger",
                    },
                  ]}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {feedback ? (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {feedback}
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remover perfil?"
        description={
          pendingRemove
            ? `Remover "${pendingRemove.displayName}" desta funcionalidade?`
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
            const result = await removeFeatureUserProfile({
              id: pendingRemove.id,
              featureId,
            });
            if (!result.ok) {
              setFeedback(result.message);
              setPendingRemove(null);
              return;
            }
            setProfiles((prev) =>
              prev.filter((p) => p.id !== pendingRemove.id),
            );
            setPendingRemove(null);
          });
        }}
      />
    </section>
  );
}
