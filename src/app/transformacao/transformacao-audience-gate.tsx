"use client";

import Link from "next/link";
import { Handshake, User, Users } from "lucide-react";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";
import { BackButton } from "@/components/ui/back-button";
import { PageHeader, SurfaceCard } from "@/components/ui/prototype";
import { cn } from "@/lib/utils";
import type { AudienceCode } from "@/types";

const AUDIENCE_ICONS: Record<AudienceCode, typeof Users> = {
  CLIENT: Users,
  ECONOMIARIO: User,
  PARTNER: Handshake,
};

export function TransformacaoAudienceGate({
  audiences,
  basePath = "/inteligencia/transformacoes",
}: {
  audiences: {
    id: string;
    name: string;
    code: AudienceCode;
    description?: string;
  }[];
  /** Prefixo de rota canônica sob Intelligence. */
  basePath?: string;
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[
          { label: "Inteligência", href: "/inteligencia" },
          { label: "Transformações" },
        ]}
        title="Atual → Futuro"
        description="Análise de cobertura entre canais atuais e futuros por público. Derivado de Implementations — não cria Evolution."
        leading={<BackButton href="/inteligencia" />}
      />

      <IntelligenceNav />

      <SurfaceCard className="p-6">
        <p className="mb-4 text-sm font-semibold text-slate-900">
          De qual público é esta visão?
        </p>
        {audiences.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhuma transformação configurada. Configure uma transição Atual →
              Futuro para identificar riscos e oportunidades.
            </p>
            <Link
              href="/canais"
              className="inline-flex text-sm font-medium text-[var(--brand)] hover:underline"
            >
              Configurar transformação
            </Link>
          </div>
        ) : (
        <div className="space-y-2">
          {audiences.map((audience) => {
            const Icon = AUDIENCE_ICONS[audience.code] ?? Users;
            return (
              <Link
                key={audience.id}
                href={`${basePath}/${audience.id}`}
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
        )}
      </SurfaceCard>
    </div>
  );
}
