"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { upsertJourney } from "@/app/actions/crud";
import { ArchiveButton } from "@/components/cadastros/row-actions";
import { CrudForm, Field } from "@/components/cadastros/crud-form";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  SectionTitle,
  SurfaceCard,
  UnderlineTabs,
} from "@/components/ui/prototype";
import { cn } from "@/lib/utils";
import type { AudienceCode } from "@/types";
import {
  GitBranch,
  Handshake,
  Link2,
  Pencil,
  Plus,
  User,
  Users,
} from "lucide-react";

type AudienceLite = {
  id: string;
  name: string;
  code: AudienceCode;
};

type CatalogJourney = {
  id: string;
  name: string;
  description: string;
  order: number;
};

type StageUsage = {
  audienceId: string;
  displayName: string;
  sortOrder: number;
  momentId: string;
  momentName: string;
};

type CatalogNode = CatalogJourney & {
  usages: StageUsage[];
};

const AUDIENCE_ICON: Record<AudienceCode, typeof Users> = {
  CLIENT: Users,
  ECONOMIARIO: User,
  PARTNER: Handshake,
};

export function JornadasCatalogClient({
  audiences,
  catalog,
  canEdit,
}: {
  audiences: AudienceLite[];
  catalog: CatalogNode[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<"sitemap" | "catalog">("sitemap");
  const [editingId, setEditingId] = useState<string | null>(null);

  const unused = useMemo(
    () => catalog.filter((c) => c.usages.length === 0),
    [catalog],
  );

  const byAudience = useMemo(() => {
    return audiences.map((audience) => {
      const stages = catalog
        .flatMap((node) =>
          node.usages
            .filter((u) => u.audienceId === audience.id)
            .map((u) => ({
              journeyId: node.id,
              catalogName: node.name,
              displayName: u.displayName,
              sortOrder: u.sortOrder,
              momentId: u.momentId,
              momentName: u.momentName,
              sharedWith: node.usages
                .filter((x) => x.audienceId !== audience.id)
                .map((x) => x.audienceId),
            })),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return { audience, stages };
    });
  }, [audiences, catalog]);

  const editing = catalog.find((c) => c.id === editingId);

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb="Cadastros › Jornadas"
        title="Catálogo global de jornadas"
        description="Sitemap das etapas compartilhadas. Use o catálogo para cruzar jornadas entre Cliente, Economiário e Parceiro — a mesma etapa pode aparecer com nomes diferentes em cada público."
        actions={<BackButton href="/jornadas" />}
      />

      <SurfaceCard className="p-4">
        <UnderlineTabs
          value={tab}
          onChange={(id) => setTab(id as "sitemap" | "catalog")}
          options={[
            { id: "sitemap", label: "Sitemap", count: catalog.length },
            { id: "catalog", label: "Gerir catálogo", count: catalog.length },
          ]}
        />
      </SurfaceCard>

      {tab === "sitemap" ? (
        <div className="space-y-5">
          <SurfaceCard className="overflow-hidden p-0">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <SectionTitle>Matriz de cruzamento</SectionTitle>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Cada linha é uma etapa do catálogo. As células mostram o nome
                exibido na jornada daquele público — células alinhadas na mesma
                linha são o mesmo ponto da experiência.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                      Etapa do catálogo
                    </th>
                    {audiences.map((a) => {
                      const Icon = AUDIENCE_ICON[a.code] ?? Users;
                      return (
                        <th
                          key={a.id}
                          className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                        >
                          <span className="inline-flex items-center gap-1.5 text-slate-700 normal-case tracking-normal">
                            <Icon className="h-3.5 w-3.5 text-[var(--brand)]" />
                            {a.name}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((node) => {
                    const isShared = node.usages.length >= 2;
                    return (
                      <tr
                        key={node.id}
                        className={cn(
                          "border-t border-[var(--border)]",
                          isShared && "bg-[var(--brand-soft)]/40",
                        )}
                      >
                        <td
                          className={cn(
                            "sticky left-0 z-10 px-4 py-3 align-top",
                            isShared
                              ? "bg-[var(--brand-soft)]/40"
                              : "bg-white",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GitBranch
                              className={cn(
                                "mt-0.5 h-4 w-4 shrink-0",
                                isShared
                                  ? "text-[var(--brand)]"
                                  : "text-slate-400",
                              )}
                            />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {node.name}
                              </p>
                              {node.description ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                                  {node.description}
                                </p>
                              ) : null}
                              {isShared ? (
                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[var(--brand-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]">
                                  <Link2 className="h-3 w-3" />
                                  Cruzamento · {node.usages.length} públicos
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        {audiences.map((a) => {
                          const usage = node.usages.find(
                            (u) => u.audienceId === a.id,
                          );
                          return (
                            <td
                              key={a.id}
                              className="px-4 py-3 align-top"
                            >
                              {usage ? (
                                <div className="rounded-lg border border-[var(--border)] bg-white px-3 py-2">
                                  <p className="font-medium text-slate-900">
                                    {usage.displayName}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {usage.momentName} · ordem {usage.sortOrder}
                                  </p>
                                  <Link
                                    href={`/jornadas/editar?publico=${a.id}`}
                                    className="mt-1.5 inline-block text-[11px] font-medium text-[var(--brand)] hover:underline"
                                  >
                                    Abrir jornada
                                  </Link>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {unused.length > 0 ? (
              <div className="border-t border-[var(--border)] bg-amber-50/60 px-4 py-2 text-xs text-amber-800">
                {unused.length} etapa
                {unused.length === 1 ? "" : "s"} no catálogo ainda sem uso em
                nenhuma jornada de público.
              </div>
            ) : null}
          </SurfaceCard>

          <div>
            <SectionTitle>Fluxos por público</SectionTitle>
            <p className="mt-1 mb-3 text-xs text-[var(--muted-foreground)]">
              Ordem real de cada jornada. Etapas com o mesmo ponto no catálogo
              ficam destacadas como cruzamento.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {byAudience.map(({ audience, stages }) => {
                const Icon = AUDIENCE_ICON[audience.code] ?? Users;
                return (
                  <SurfaceCard key={audience.id} className="p-4">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {audience.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {stages.length} etapa
                            {stages.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/jornadas/editar?publico=${audience.id}`}
                        className="text-xs font-medium text-[var(--brand)] hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                    {stages.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-[var(--border)] px-3 py-6 text-center text-xs text-slate-400">
                        Sem etapas neste público
                      </p>
                    ) : (
                      <ol className="space-y-0">
                        {stages.map((stage, index) => {
                          const isShared = stage.sharedWith.length > 0;
                          return (
                            <li key={`${stage.journeyId}-${stage.sortOrder}`}>
                              <div className="flex gap-3">
                                <div className="flex w-6 flex-col items-center">
                                  <span
                                    className={cn(
                                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                      isShared
                                        ? "bg-[var(--sidebar)] text-white"
                                        : "bg-slate-100 text-slate-600",
                                    )}
                                  >
                                    {index + 1}
                                  </span>
                                  {index < stages.length - 1 ? (
                                    <span className="my-1 w-px flex-1 bg-slate-200" />
                                  ) : null}
                                </div>
                                <div
                                  className={cn(
                                    "mb-3 min-w-0 flex-1 rounded-lg border px-3 py-2",
                                    isShared
                                      ? "border-[var(--brand)]/30 bg-[var(--brand-soft)]/50"
                                      : "border-[var(--border)] bg-white",
                                  )}
                                >
                                  <p className="text-sm font-semibold text-slate-900">
                                    {stage.displayName}
                                  </p>
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    Catálogo: {stage.catalogName} ·{" "}
                                    {stage.momentName}
                                  </p>
                                  {isShared ? (
                                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand)]">
                                      <Link2 className="h-3 w-3" />
                                      Compartilhada
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </SurfaceCard>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {canEdit ? (
            <SurfaceCard className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <SectionTitle>
                  {editing ? "Editar etapa do catálogo" : "Nova etapa do catálogo"}
                </SectionTitle>
                {editing ? (
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs font-medium text-[var(--brand)] hover:underline"
                  >
                    Nova etapa
                  </button>
                ) : null}
              </div>
              <p className="mb-4 text-xs text-[var(--muted-foreground)]">
                Etapas do catálogo são a chave estável entre públicos. Depois de
                criar aqui, ative-as na jornada de cada público com o nome
                desejado.
              </p>
              <CrudForm key={editing?.id ?? "new"} action={upsertJourney}>
                {editing ? (
                  <input type="hidden" name="id" value={editing.id} />
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Nome canônico"
                    name="name"
                    required
                    defaultValue={editing?.name}
                  />
                  <Field
                    label="Ordem no catálogo"
                    name="sort_order"
                    type="number"
                    defaultValue={editing?.order ?? catalog.length + 1}
                  />
                </div>
                <Field
                  label="Descrição"
                  name="description"
                  as="textarea"
                  defaultValue={editing?.description}
                />
              </CrudForm>
            </SurfaceCard>
          ) : null}

          <SurfaceCard className="divide-y divide-[var(--border)] overflow-hidden p-0">
            <div className="px-4 py-3">
              <SectionTitle>Etapas cadastradas</SectionTitle>
            </div>
            {catalog.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">
                Nenhuma etapa no catálogo.
              </p>
            ) : (
              catalog.map((node) => (
                <div
                  key={node.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {node.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ordem {node.order}
                      {node.usages.length > 0
                        ? ` · usada em ${node.usages.length} público${node.usages.length === 1 ? "" : "s"}`
                        : " · sem uso"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(node.id);
                            setTab("catalog");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <ArchiveButton table="journeys" id={node.id} />
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
            {canEdit ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar etapa ao catálogo
                </button>
              </div>
            ) : null}
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
