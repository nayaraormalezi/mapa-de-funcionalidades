import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { featureStageLabel } from "@/lib/labels";
import { PageBreadcrumb } from "@/components/ui/prototype";
import { formatDate } from "@/lib/utils";
import { getDatabase } from "@/services/db";

/**
 * Cadastro legado de RoadmapItem.
 * Fase 6: somente leitura dos registros históricos.
 * Planejamento ativo: /roadmap (Implementation + FeatureEvolution).
 */
export default async function CadastroRoadmapPage() {
  const db = await getDatabase();
  const legacyItems = db.roadmapItems;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackButton href="/configuracoes?tab=cadastros" />
        <div className="space-y-1">
          <PageBreadcrumb
            items={[
              { label: "Configurações", href: "/configuracoes" },
              { label: "Cadastros", href: "/configuracoes?tab=cadastros" },
              { label: "Planejamento legado" },
            ]}
          />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Planejamento legado
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            <code className="text-xs">RoadmapItem</code> está deprecado. A fonte
            de verdade do planejamento é a{" "}
            <strong>implementação</strong> (FeatureChannelContext) e a{" "}
            <strong>evolução</strong> (FeatureEvolution). Use a{" "}
            <Link
              href="/roadmap"
              className="font-medium text-[var(--brand)] hover:underline"
            >
              Gestão de entregas
            </Link>{" "}
            para visualizar e editar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros legados (somente leitura)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {legacyItems.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Nenhum RoadmapItem legado encontrado.
            </p>
          ) : (
            legacyItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {featureStageLabel[
                      item.phase as keyof typeof featureStageLabel
                    ] ?? item.phase}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {db.features.find((f) => f.id === item.featureId)?.name} ·
                    Previsão {formatDate(item.expectedDate)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    id legado: {item.id}
                  </p>
                </div>
                <Link
                  href={`/funcionalidades/${item.featureId}`}
                  className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--muted)]"
                >
                  Mostrar ficha
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
