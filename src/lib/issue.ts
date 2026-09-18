/**
 * Issue (Gap₂) — Problema registrado e persistido.
 *
 * Conceitos oficiais (UI — Fase 15.3), domínio Melhorias:
 * - Lacuna = ausência ou insuficiência de cobertura (Coverage Gap derivado).
 * - Problema = falha/fricção em algo existente (esta entidade / tabela `gaps`).
 * - Oportunidade = possibilidade de melhoria a partir de evidências.
 * - Evolução = alteração planejada ou realizada em uma funcionalidade.
 *
 * Lacuna, Problema e Oportunidade são sinais/achados.
 * Evolução é uma ação de mudança — não é conversão automática dos sinais.
 *
 * NÃO confundir com Coverage Gap (DetectedCoverageGap / HubCoverageGap),
 * que é derivado de Implementation/FCC e não é persistido como Issue.
 *
 * Persistência física (Fase 12): tabela Supabase `gaps` continua sendo o
 * storage. Renomear tabela = fase futura (zero consumidores + backfill).
 */

import type { Gap, GapStatus, GapType } from "@/types";

/**
 * Issue = entidade canônica (ex-Gap₂).
 * O type `Gap` permanece como alias DEPRECATED para compatibilidade.
 */
export type Issue = Gap;

/** @see GapType — tipos de Issue cadastrada (≠ Coverage Gap derivado). */
export type IssueType = GapType;

/** @see GapStatus */
export type IssueStatus = GapStatus;

/** Tabela física que armazena Issues (legado Gap₂). */
export const ISSUE_STORAGE_TABLE = "gaps" as const;

/** Prefixo de ID para Issues novas (`iss-…`). Legado: `gap-…`. */
export function issueIdPrefix(): "iss" {
  return "iss";
}

/**
 * Coverage Gap nunca deve ser tratado como Issue.
 * IDs de cobertura usam prefixo `cov-`.
 */
export function isCoverageGapId(id: string): boolean {
  return id.startsWith("cov-");
}
