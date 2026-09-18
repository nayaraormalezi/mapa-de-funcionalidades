import Link from "next/link";
import { IntelligenceNav } from "@/components/intelligence/intelligence-nav";
import {
  PageHeader,
  SurfaceCard,
} from "@/components/ui/prototype";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, ArrowRight, GitBranch } from "lucide-react";

/**
 * Hub do domínio Inteligência (Fase 15.5).
 * Insights deixaram de ser página/KPI — são resultados derivados em
 * Comparações e Transformações (e síntese em Relatórios).
 */
export default function InteligenciaPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Inteligência" }]}
        title="Inteligência"
        description="Encontre padrões, diferenças e sinais que ajudam a compreender e evoluir a experiência."
      />

      <SurfaceCard className="border-[#e6f0f7] bg-[#f5f9fc] p-4 text-sm text-slate-700">
        <strong>Como ler:</strong> Inteligência cruza dados do PRISMA.
        Insights são resultados dessas análises — não cadastros. Lacunas,
        problemas e oportunidades ficam em Melhorias.
      </SurfaceCard>

      <IntelligenceNav />

      <div className="grid gap-4 md:grid-cols-2">
        <SurfaceCard className="flex flex-col p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Comparações</h2>
          <p className="mt-1.5 flex-1 text-sm text-[var(--muted-foreground)]">
            Compare canais, públicos ou dimensões do ecossistema e identifique
            diferenças de cobertura, status e saúde.
          </p>
          <Button asChild className="mt-4 w-fit" size="sm">
            <Link href="/inteligencia/comparacoes">
              Comparar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
            <GitBranch className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Transformações
          </h2>
          <p className="mt-1.5 flex-1 text-sm text-[var(--muted-foreground)]">
            Analise a transição Atual → Futuro, destinos indefinidos e riscos
            de migração entre canais.
          </p>
          <Button asChild className="mt-4 w-fit" size="sm">
            <Link href="/inteligencia/transformacoes">
              Analisar transformação
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </SurfaceCard>
      </div>
    </div>
  );
}
