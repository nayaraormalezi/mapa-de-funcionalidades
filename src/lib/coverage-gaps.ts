/**
 * Gaps de cobertura: a funcionalidade deveria estar disponível no canal,
 * mas não está prevista ou permanece em backlog.
 *
 * Ausência de pesquisa/avaliação NÃO gera gap — isso é outra dimensão (oportunidade).
 * Issue persistida (tabela `gaps`) NÃO é Coverage Gap — ver `@/lib/issue`.
 */

export type CoverageGapReason = "BACKLOG" | "NOT_PLANNED";

export type DetectedCoverageGap = {
  id: string;
  channelName: string;
  channelContextId: string;
  fccId: string;
  phase: string;
  expectedDate: string | null;
  reason: CoverageGapReason;
  title: string;
  description: string;
};

type ChannelCardLike = {
  key: string;
  channelName: string;
  phase: string;
  expectedDate: string | null;
  primaryContext: {
    channelContextId: string;
    featureChannelContextId: string;
  };
};

/** Fases em que a funcionalidade já está (ou está sendo) entregue — não é gap. */
const DELIVERY_PHASES = new Set([
  "AVAILABLE",
  "HOMOLOGATION",
  "DEVELOPMENT",
  "UX_UI",
]);

/**
 * Detecta gaps de cobertura a partir dos canais associados à funcionalidade.
 *
 * - BACKLOG → gap (deveria estar disponível, está só no backlog)
 * - Sem previsão (sem expectedDate) e ainda não disponível → gap (não prevista)
 * - Em UX/UI, desenvolvimento ou homologação com previsão → não é gap
 */
export function detectCoverageGaps(
  cards: ChannelCardLike[],
): DetectedCoverageGap[] {
  const gaps: DetectedCoverageGap[] = [];

  for (const card of cards) {
    if (card.phase === "AVAILABLE") continue;
    if (card.phase === "REMOVED" || card.phase === "PAUSED") continue;

    const channelContextId = card.primaryContext.channelContextId;
    const fccId = card.primaryContext.featureChannelContextId;

    if (card.phase === "BACKLOG") {
      gaps.push({
        id: `cov-backlog-${fccId}`,
        channelName: card.channelName,
        channelContextId,
        fccId,
        phase: card.phase,
        expectedDate: card.expectedDate,
        reason: "BACKLOG",
        title: `Lacuna de cobertura · ${card.channelName}`,
        description:
          "A funcionalidade está em backlog neste canal — deveria estar disponível, mas ainda não saiu do backlog.",
      });
      continue;
    }

    const inDelivery = DELIVERY_PHASES.has(card.phase);
    if (inDelivery && !card.expectedDate) {
      gaps.push({
        id: `cov-unplanned-${fccId}`,
        channelName: card.channelName,
        channelContextId,
        fccId,
        phase: card.phase,
        expectedDate: null,
        reason: "NOT_PLANNED",
        title: `Não prevista · ${card.channelName}`,
        description:
          "A funcionalidade está associada a este canal, mas sem previsão de disponibilidade.",
      });
    }
  }

  return gaps;
}
