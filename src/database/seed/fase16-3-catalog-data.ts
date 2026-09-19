/**
 * Fase 16.3 — catálogo estrutural inicial (Jornada → Necessidade → Feature).
 * Apenas dados; a carga fica em scripts/load-fase16-3-catalog.ts.
 *
 * Não inclui: produtos, canais, FCC, status, tickets, Figma, evoluções, melhorias, avaliações.
 */

export const FASE16_3_JOURNEY_ID = "jrn-consorcio";

export const FASE16_3_STAGE_IDS = {
  descoberta: "js-jrn-descoberta",
  consideracao: "js-jrn-consideracao",
  contratacao: "js-jrn-contratacao",
  onboarding: "js-jrn-onboarding",
  acompanhamento: "js-jrn-acompanhamento",
  lance: "js-jrn-lance",
  contemplacao: "js-jrn-contemplacao",
  usoCredito: "js-jrn-uso-credito",
  posUso: "js-jrn-pos-uso",
  encerramento: "js-jrn-encerramento",
} as const;

export const FASE16_3_AUDIENCE_IDS = {
  client: "aud-client",
  economiario: "aud-economiario",
  partner: "aud-partner",
} as const;

export type Fase163AudienceKey = keyof typeof FASE16_3_AUDIENCE_IDS;
export type Fase163StageKey = keyof typeof FASE16_3_STAGE_IDS;

export type Fase163NeedSeed = {
  /** Chave estável para idempotência (não é o UUID final se já existir match). */
  key: string;
  stage: Fase163StageKey;
  audience: Fase163AudienceKey;
  name: string;
  description?: string;
  features: string[];
};

/**
 * Aliases → nome canônico da Feature (consolidação semântica explícita).
 * Só merge quando a identidade é clara.
 */
export const FASE16_3_FEATURE_ALIASES: Record<string, string> = {
  "simular valores": "Simular valor de crédito",
  "simular prazos": "Simular prazo",
  "consultar lance": "Consultar lance realizado",
  "consultar resultado": "Consultar resultado do lance",
  "consultar utilizacao": "Consultar utilização do crédito",
  "consultar utilização": "Consultar utilização do crédito",
  "consultar andamento": "Consultar andamento da contemplação",
  "consultar saldo": "Consultar saldo final",
  "consultar encerramento": "Consultar encerramento da cota",
  "consultar orientacoes": "Consultar orientações",
  "consultar pendencias": "Consultar pendências",
};

export function normalizeFeatureLabel(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalFeatureName(raw: string): string {
  const key = normalizeFeatureLabel(raw);
  return FASE16_3_FEATURE_ALIASES[key] ?? raw.trim().replace(/\s+/g, " ");
}

export function slugify(raw: string): string {
  return normalizeFeatureLabel(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Catálogo Fase 16.3 — 10 etapas × 3 públicos. */
export const FASE16_3_NEEDS: Fase163NeedSeed[] = [
  // —— Descoberta ——
  {
    key: "descoberta-client",
    stage: "descoberta",
    audience: "client",
    name: "Entender o que é o consórcio e se ele faz sentido para meu objetivo.",
    features: [
      "Conhecer o consórcio",
      "Consultar produtos",
      "Consultar características do produto",
      "Consultar condições",
      "Simular consórcio",
      "Consultar FAQ",
    ],
  },
  {
    key: "descoberta-economiario",
    stage: "descoberta",
    audience: "economiario",
    name: "Entender o produto para identificar oportunidades e orientar o cliente.",
    features: [
      "Consultar produtos",
      "Consultar características do produto",
      "Consultar condições",
      "Simular consórcio",
      "Consultar materiais de apoio",
      "Consultar campanhas",
    ],
  },
  {
    key: "descoberta-partner",
    stage: "descoberta",
    audience: "partner",
    name: "Conhecer as opções de consórcio para apresentar ao cliente.",
    features: [
      "Consultar produtos",
      "Consultar características do produto",
      "Consultar condições",
      "Simular consórcio",
      "Consultar materiais de apoio",
      "Consultar campanhas",
    ],
  },

  // —— Consideração ——
  {
    key: "consideracao-client",
    stage: "consideracao",
    audience: "client",
    name: "Comparar alternativas e entender qual opção atende melhor ao que preciso.",
    features: [
      "Simular consórcio",
      "Comparar planos",
      "Simular valor de crédito",
      "Simular prazo",
      "Consultar parcelas",
      "Consultar taxa de administração",
      "Consultar condições do grupo",
      "Consultar informações do plano",
      "Retomar simulação",
    ],
  },
  {
    key: "consideracao-economiario",
    stage: "consideracao",
    audience: "economiario",
    name: "Avaliar alternativas para recomendar uma opção adequada ao cliente.",
    features: [
      "Simular consórcio",
      "Comparar planos",
      "Simular valores",
      "Simular prazos",
      "Consultar parcelas",
      "Consultar condições do grupo",
      "Consultar informações do plano",
      "Retomar simulação",
    ],
  },
  {
    key: "consideracao-partner",
    stage: "consideracao",
    audience: "partner",
    name: "Encontrar uma alternativa adequada para apresentar ao cliente.",
    features: [
      "Simular consórcio",
      "Comparar planos",
      "Simular valores",
      "Simular prazos",
      "Consultar parcelas",
      "Consultar condições do grupo",
      "Consultar informações do plano",
      "Retomar simulação",
    ],
  },

  // —— Contratação ——
  {
    key: "contratacao-client",
    stage: "contratacao",
    audience: "client",
    name: "Contratar o consórcio com segurança e saber o que preciso fazer para concluir a contratação.",
    features: [
      "Iniciar contratação",
      "Preencher dados",
      "Revisar proposta",
      "Consultar resumo da contratação",
      "Aceitar condições",
      "Assinar documentos",
      "Acompanhar assinatura",
      "Retomar proposta",
      "Recuperar proposta",
      "Consultar situação da proposta",
    ],
  },
  {
    key: "contratacao-economiario",
    stage: "contratacao",
    audience: "economiario",
    name: "Apoiar a contratação e acompanhar o andamento da proposta do cliente.",
    features: [
      "Iniciar contratação",
      "Criar proposta",
      "Consultar proposta",
      "Editar proposta",
      "Acompanhar proposta",
      "Reenviar proposta",
      "Recuperar proposta",
      "Consultar situação da assinatura",
      "Consultar pendências",
    ],
  },
  {
    key: "contratacao-partner",
    stage: "contratacao",
    audience: "partner",
    name: "Realizar e acompanhar a contratação do cliente de forma assistida.",
    features: [
      "Iniciar contratação",
      "Criar proposta",
      "Consultar proposta",
      "Editar proposta",
      "Acompanhar proposta",
      "Reenviar proposta",
      "Recuperar proposta",
      "Consultar situação da assinatura",
      "Consultar pendências",
    ],
  },

  // —— Onboarding ——
  {
    key: "onboarding-client",
    stage: "onboarding",
    audience: "client",
    name: "Entender meu contrato, meus próximos passos e como começar a utilizar meu consórcio.",
    features: [
      "Consultar contrato",
      "Consultar dados da cota",
      "Consultar grupo",
      "Consultar número da cota",
      "Consultar condições contratadas",
      "Consultar próxima parcela",
      "Emitir boleto",
      "Consultar calendário de assembleias",
      "Acessar orientações iniciais",
      "Consultar canais de atendimento",
    ],
  },
  {
    key: "onboarding-economiario",
    stage: "onboarding",
    audience: "economiario",
    name: "Ter informações suficientes para orientar o cliente após a contratação.",
    features: [
      "Consultar contrato",
      "Consultar situação da cota",
      "Consultar dados da cota",
      "Consultar grupo",
      "Consultar parcelas",
      "Consultar pendências",
      "Consultar orientações",
      "Consultar canais de atendimento",
    ],
  },
  {
    key: "onboarding-partner",
    stage: "onboarding",
    audience: "partner",
    name: "Acompanhar o cliente após a venda e saber quais orientações fornecer.",
    features: [
      "Consultar contrato",
      "Consultar situação da cota",
      "Consultar dados da cota",
      "Consultar grupo",
      "Consultar parcelas",
      "Consultar pendências",
      "Consultar orientações",
      "Consultar canais de atendimento",
    ],
  },

  // —— Acompanhamento ——
  {
    key: "acompanhamento-client",
    stage: "acompanhamento",
    audience: "client",
    name: "Acompanhar minha cota, meus pagamentos e saber o que está acontecendo com meu consórcio.",
    features: [
      "Consultar situação da cota",
      "Consultar saldo devedor",
      "Consultar parcelas",
      "Emitir boleto",
      "Consultar pagamentos",
      "Consultar extrato",
      "Consultar segunda via de extrato",
      "Consultar grupo",
      "Consultar assembleias",
      "Consultar resultado de assembleia",
      "Consultar calendário",
      "Consultar histórico da cota",
      "Atualizar dados cadastrais",
      "Consultar comunicados",
      "Solicitar atendimento",
    ],
  },
  {
    key: "acompanhamento-economiario",
    stage: "acompanhamento",
    audience: "economiario",
    name: "Consultar a situação do cliente e apoiá-lo durante o período de participação no grupo.",
    features: [
      "Consultar situação da cota",
      "Consultar parcelas",
      "Consultar pagamentos",
      "Consultar extrato",
      "Consultar grupo",
      "Consultar assembleias",
      "Consultar resultado de assembleia",
      "Consultar pendências",
      "Consultar dados cadastrais",
      "Consultar histórico",
      "Solicitar atendimento",
    ],
  },
  {
    key: "acompanhamento-partner",
    stage: "acompanhamento",
    audience: "partner",
    name: "Acompanhar a situação da cota do cliente para orientá-lo quando necessário.",
    features: [
      "Consultar situação da cota",
      "Consultar parcelas",
      "Consultar pagamentos",
      "Consultar extrato",
      "Consultar grupo",
      "Consultar assembleias",
      "Consultar resultado de assembleia",
      "Consultar pendências",
      "Consultar histórico",
      "Solicitar atendimento",
    ],
  },

  // —— Lance ——
  {
    key: "lance-client",
    stage: "lance",
    audience: "client",
    name: "Entender minhas possibilidades de lance e participar da assembleia para tentar antecipar minha contemplação.",
    features: [
      "Consultar possibilidade de lance",
      "Consultar regras de lance",
      "Simular lance",
      "Registrar lance",
      "Consultar lance realizado",
      "Alterar lance",
      "Cancelar lance",
      "Programar lance recorrente",
      "Consultar resultado do lance",
      "Consultar histórico de lances",
      "Consultar lance com FGTS",
    ],
  },
  {
    key: "lance-economiario",
    stage: "lance",
    audience: "economiario",
    name: "Orientar o cliente sobre as modalidades de lance e acompanhar sua participação.",
    features: [
      "Consultar regras de lance",
      "Simular lance",
      "Registrar lance",
      "Consultar lance realizado",
      "Alterar lance",
      "Cancelar lance",
      "Consultar resultado",
      "Consultar histórico",
      "Consultar regras de FGTS",
    ],
  },
  {
    key: "lance-partner",
    stage: "lance",
    audience: "partner",
    name: "Orientar o cliente e acompanhar sua participação no lance.",
    features: [
      "Consultar regras de lance",
      "Simular lance",
      "Registrar lance",
      "Consultar lance",
      "Alterar lance",
      "Cancelar lance",
      "Consultar resultado",
      "Consultar histórico",
      "Consultar regras de FGTS",
    ],
  },

  // —— Contemplação ——
  {
    key: "contemplacao-client",
    stage: "contemplacao",
    audience: "client",
    name: "Saber que fui contemplado, entender o que acontece agora e quais documentos/providências preciso realizar.",
    features: [
      "Consultar contemplação",
      "Consultar resultado da assembleia",
      "Consultar crédito disponível",
      "Consultar próximos passos",
      "Consultar documentos necessários",
      "Enviar documentos",
      "Acompanhar análise",
      "Consultar pendências",
      "Consultar status da contemplação",
      "Solicitar atendimento",
    ],
  },
  {
    key: "contemplacao-economiario",
    stage: "contemplacao",
    audience: "economiario",
    name: "Identificar clientes contemplados e orientá-los nos próximos passos.",
    features: [
      "Consultar contemplação",
      "Consultar crédito disponível",
      "Consultar documentos necessários",
      "Consultar pendências",
      "Consultar status da análise",
      "Consultar andamento da contemplação",
      "Consultar orientações",
    ],
  },
  {
    key: "contemplacao-partner",
    stage: "contemplacao",
    audience: "partner",
    name: "Acompanhar a contemplação do cliente e orientá-lo sobre os próximos passos.",
    features: [
      "Consultar contemplação",
      "Consultar crédito disponível",
      "Consultar documentos necessários",
      "Consultar pendências",
      "Consultar status da análise",
      "Consultar andamento",
      "Consultar orientações",
    ],
  },

  // —— Uso do crédito ——
  {
    key: "uso-credito-client",
    stage: "usoCredito",
    audience: "client",
    name: "Utilizar meu crédito de acordo com as regras do meu consórcio e acompanhar todo o processo.",
    features: [
      "Consultar crédito disponível",
      "Consultar regras de utilização",
      "Consultar documentos necessários",
      "Solicitar utilização do crédito",
      "Enviar documentos",
      "Acompanhar análise",
      "Consultar pendências",
      "Acompanhar pagamento",
      "Consultar status da utilização",
      "Consultar orientações para aquisição",
    ],
  },
  {
    key: "uso-credito-economiario",
    stage: "usoCredito",
    audience: "economiario",
    name: "Apoiar o cliente durante o processo de utilização do crédito.",
    features: [
      "Consultar crédito disponível",
      "Consultar regras de utilização",
      "Consultar documentos necessários",
      "Acompanhar solicitação",
      "Consultar pendências",
      "Consultar status da utilização",
      "Consultar orientações",
    ],
  },
  {
    key: "uso-credito-partner",
    stage: "usoCredito",
    audience: "partner",
    name: "Acompanhar e orientar o cliente durante a utilização do crédito.",
    features: [
      "Consultar crédito disponível",
      "Consultar regras de utilização",
      "Consultar documentos necessários",
      "Acompanhar solicitação",
      "Consultar pendências",
      "Consultar status da utilização",
      "Consultar orientações",
    ],
  },

  // —— Pós-uso ——
  {
    key: "pos-uso-client",
    stage: "posUso",
    audience: "client",
    name: "Acompanhar o que acontece depois da utilização do crédito e continuar tendo suporte quando necessário.",
    features: [
      "Consultar utilização do crédito",
      "Consultar histórico",
      "Consultar documentos",
      "Consultar situação do processo",
      "Consultar pendências",
      "Consultar informações do bem",
      "Solicitar atendimento",
      "Consultar orientações",
      "Atualizar dados",
    ],
  },
  {
    key: "pos-uso-economiario",
    stage: "posUso",
    audience: "economiario",
    name: "Apoiar o cliente após a utilização do crédito quando houver necessidade.",
    features: [
      "Consultar utilização do crédito",
      "Consultar histórico",
      "Consultar documentos",
      "Consultar situação do processo",
      "Consultar pendências",
      "Consultar orientações",
      "Solicitar atendimento",
    ],
  },
  {
    key: "pos-uso-partner",
    stage: "posUso",
    audience: "partner",
    name: "Acompanhar o cliente no pós-uso quando necessário.",
    features: [
      "Consultar utilização do crédito",
      "Consultar histórico",
      "Consultar situação do processo",
      "Consultar pendências",
      "Consultar orientações",
      "Solicitar atendimento",
    ],
  },

  // —— Encerramento ——
  {
    key: "encerramento-client",
    stage: "encerramento",
    audience: "client",
    name: "Entender o encerramento da minha cota e ter acesso ao histórico e aos documentos finais.",
    features: [
      "Consultar encerramento da cota",
      "Consultar situação final",
      "Consultar histórico",
      "Consultar documentos",
      "Consultar saldo final",
      "Consultar informações de devolução",
      "Emitir documentos",
      "Solicitar atendimento",
    ],
  },
  {
    key: "encerramento-economiario",
    stage: "encerramento",
    audience: "economiario",
    name: "Consultar a situação final da cota e orientar o cliente sobre o encerramento.",
    features: [
      "Consultar encerramento",
      "Consultar situação final",
      "Consultar histórico",
      "Consultar documentos",
      "Consultar saldo",
      "Consultar orientações",
    ],
  },
  {
    key: "encerramento-partner",
    stage: "encerramento",
    audience: "partner",
    name: "Consultar a situação final da cota e orientar o cliente.",
    features: [
      "Consultar encerramento",
      "Consultar situação final",
      "Consultar histórico",
      "Consultar documentos",
      "Consultar saldo",
      "Consultar orientações",
    ],
  },
];

/** JourneyAudienceStage canônico: 3 públicos × 10 etapas (Venda p/ eco/partner na Contratação). */
export type Fase163JasSeed = {
  id: string;
  audience: Fase163AudienceKey;
  stage: Fase163StageKey;
  displayName: string;
  sortOrder: number;
  momentId: "mom-sale" | "mom-after-sale";
};

const STAGE_META: {
  stage: Fase163StageKey;
  sortOrder: number;
  momentId: "mom-sale" | "mom-after-sale";
  name: string;
}[] = [
  { stage: "descoberta", sortOrder: 1, momentId: "mom-sale", name: "Descoberta" },
  { stage: "consideracao", sortOrder: 2, momentId: "mom-sale", name: "Consideração" },
  { stage: "contratacao", sortOrder: 3, momentId: "mom-sale", name: "Contratação" },
  { stage: "onboarding", sortOrder: 4, momentId: "mom-after-sale", name: "Onboarding" },
  {
    stage: "acompanhamento",
    sortOrder: 5,
    momentId: "mom-after-sale",
    name: "Acompanhamento",
  },
  { stage: "lance", sortOrder: 6, momentId: "mom-after-sale", name: "Lance" },
  {
    stage: "contemplacao",
    sortOrder: 7,
    momentId: "mom-after-sale",
    name: "Contemplação",
  },
  {
    stage: "usoCredito",
    sortOrder: 8,
    momentId: "mom-after-sale",
    name: "Uso do crédito",
  },
  { stage: "posUso", sortOrder: 9, momentId: "mom-after-sale", name: "Pós-uso" },
  {
    stage: "encerramento",
    sortOrder: 10,
    momentId: "mom-after-sale",
    name: "Encerramento",
  },
];

function jasId(
  audience: Fase163AudienceKey,
  stage: Fase163StageKey,
): string {
  const aud =
    audience === "client"
      ? "cli"
      : audience === "economiario"
        ? "eco"
        : "par";
  const stageSlug =
    stage === "usoCredito"
      ? "uso-credito"
      : stage === "posUso"
        ? "pos-uso"
        : stage === "consideracao"
          ? "consideracao"
          : stage === "contratacao"
            ? "contratacao"
            : stage === "contemplacao"
              ? "contemplacao"
              : stage === "acompanhamento"
                ? "acompanhamento"
                : stage === "encerramento"
                  ? "encerramento"
                  : stage;
  return `jas-${aud}-${stageSlug}`;
}

export const FASE16_3_JAS: Fase163JasSeed[] = (
  ["client", "economiario", "partner"] as const
).flatMap((audience) =>
  STAGE_META.map((meta) => ({
    id: jasId(audience, meta.stage),
    audience,
    stage: meta.stage,
    displayName:
      meta.stage === "contratacao" && audience !== "client"
        ? "Venda"
        : meta.name,
    sortOrder: meta.sortOrder,
    momentId: meta.momentId,
  })),
);

/** Conjunto único de Features após consolidação de aliases. */
export function uniqueCanonicalFeatures(): string[] {
  const set = new Map<string, string>();
  for (const need of FASE16_3_NEEDS) {
    for (const raw of need.features) {
      const name = canonicalFeatureName(raw);
      const key = normalizeFeatureLabel(name);
      if (!set.has(key)) set.set(key, name);
    }
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
