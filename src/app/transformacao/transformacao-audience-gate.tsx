"use client";

import Link from "next/link";
import { ArrowLeft, Handshake, User, Users } from "lucide-react";
import { PageHeader, SurfaceCard } from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AudienceCode } from "@/types";

const AUDIENCE_ICONS: Record<AudienceCode, typeof Users> = {
  CLIENT: Users,
  ECONOMIARIO: User,
  PARTNER: Handshake,
};

export function TransformacaoAudienceGate({
  audiences,
}: {
  audiences: {
    id: string;
    name: string;
    code: AudienceCode;
    description?: string;
  }[];
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Canais › Transformação"
        title="Atual → Futuro"
        description="Escolha o público para ver somente a transformação daquele perfil."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/canais">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
          </Button>
        }
      />

      <SurfaceCard className="p-6">
        <p className="mb-4 text-sm font-semibold text-slate-900">
          De qual público é esta visão?
        </p>
        <div className="space-y-2">
          {audiences.map((audience) => {
            const Icon = AUDIENCE_ICONS[audience.code] ?? Users;
            return (
              <Link
                key={audience.id}
                href={`/transformacao/${audience.id}`}
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
              </Link>
            );
          })}
        </div>
      </SurfaceCard>
    </div>
  );
}
