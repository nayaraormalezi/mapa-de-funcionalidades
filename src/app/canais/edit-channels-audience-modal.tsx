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

export function EditChannelsAudienceModal({
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-channels-title"
        className="relative z-[81] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
              Editar canais
            </p>
            <h2
              id="edit-channels-title"
              className="mt-1 text-xl font-semibold text-slate-900"
            >
              De qual público são estes canais?
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Cada público tem seus canais (atuais e futuros) por momento de
              Venda e Pós-venda.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 p-6">
          {audiences.map((audience) => {
            const Icon = AUDIENCE_ICONS[audience.code] ?? Users;
            return (
              <button
                key={audience.id}
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/canais/editar?publico=${audience.id}`);
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
