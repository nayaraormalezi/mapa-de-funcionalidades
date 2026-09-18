"use client";

import { useRouter } from "next/navigation";
import { Handshake, User, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudienceCode } from "@/types";

const AUDIENCE_ICONS: Record<AudienceCode, typeof Users> = {
  CLIENT: Users,
  ECONOMIARIO: User,
  PARTNER: Handshake,
};

type AudienceOption = {
  id: string;
  name: string;
  code: AudienceCode;
  description?: string;
};

export function EditJourneysAudienceModal({
  open,
  onClose,
  audiences,
}: {
  open: boolean;
  onClose: () => void;
  audiences: AudienceOption[];
}) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-journeys-title"
        className="relative z-[81] flex max-h-[min(92dvh,100%)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Editar jornadas
            </p>
            <h2
              id="edit-journeys-title"
              className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl"
            >
              De qual público é esta jornada?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Cada público tem sua própria jornada. As etapas podem ser
              customizadas por momento (Venda ou Pós-venda).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {audiences.map((audience) => {
            const Icon = AUDIENCE_ICONS[audience.code] ?? Users;
            return (
              <button
                key={audience.id}
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/jornadas/editar?publico=${audience.id}`);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3.5 text-left transition-colors",
                  "hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {audience.name}
                  </span>
                  {audience.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {audience.description}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
