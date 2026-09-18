/**
 * Taxonomia de avaliações UX/CX.
 * Hierarquia: Área → Tipo de estudo → Método/pesquisa → Resultado → Evidências
 */

export type EvaluationAreaCode =
  | "CX"
  | "UX"
  | "UI"
  | "ACCESSIBILITY"
  | "CONTENT"
  | "DATA";

export type EvaluationStudyTypeCode =
  | "QUANTITATIVE"
  | "QUALITATIVE"
  | "EXPERT"
  | "BEHAVIORAL"
  | "VISUAL"
  | "CUSTOM";

export type EvaluationStatusCode =
  | "NOT_EVALUATED"
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NEEDS_UPDATE";

export type MethodFieldKind = "text" | "textarea" | "number" | "url";

export type MethodFieldDef = {
  key: string;
  label: string;
  kind: MethodFieldKind;
  required?: boolean;
  /** Incluir no resumo do card / linha de resultado. */
  result?: boolean;
  placeholder?: string;
};

export type EvaluationMethodDef = {
  code: string;
  label: string;
  shortLabel: string;
  studyType: EvaluationStudyTypeCode;
  fields: MethodFieldDef[];
};

export type EvaluationStudyTypeDef = {
  code: EvaluationStudyTypeCode;
  label: string;
};

export type EvaluationAreaDef = {
  code: EvaluationAreaCode;
  label: string;
  shortLabel: string;
  studyTypes: EvaluationStudyTypeCode[];
  methods: EvaluationMethodDef[];
};

export const EVALUATION_STATUS_LABEL: Record<EvaluationStatusCode, string> = {
  NOT_EVALUATED: "Não avaliada",
  PLANNED: "Planejada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  NEEDS_UPDATE: "Atualização necessária",
};

export const STUDY_TYPE_LABEL: Record<EvaluationStudyTypeCode, string> = {
  QUANTITATIVE: "Pesquisa quantitativa",
  QUALITATIVE: "Pesquisa qualitativa",
  EXPERT: "Avaliação especializada",
  BEHAVIORAL: "Análise comportamental",
  VISUAL: "Avaliação visual",
  CUSTOM: "Personalizada",
};

const commonMetaFields: MethodFieldDef[] = [];

function scoreField(
  key: string,
  label: string,
  placeholder?: string,
): MethodFieldDef {
  return { key, label, kind: "number", required: true, result: true, placeholder };
}

function countField(key: string, label: string): MethodFieldDef {
  return { key, label, kind: "number", result: true };
}

export const EVALUATION_AREAS: EvaluationAreaDef[] = [
  {
    code: "CX",
    label: "CX — Customer Experience",
    shortLabel: "CX",
    studyTypes: ["QUANTITATIVE", "QUALITATIVE"],
    methods: [
      {
        code: "CES",
        label: "CES — Customer Effort Score",
        shortLabel: "CES",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("score", "Resultado CES", "ex.: 4.2"),
          countField("responses", "Quantidade de respostas"),
          { key: "scale", label: "Escala máxima", kind: "number", placeholder: "5" },
        ],
      },
      {
        code: "CSAT",
        label: "CSAT — Customer Satisfaction Score",
        shortLabel: "CSAT",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("score", "Resultado CSAT (%)", "ex.: 87"),
          countField("responses", "Quantidade de respostas"),
        ],
      },
      {
        code: "NPS",
        label: "NPS — Net Promoter Score",
        shortLabel: "NPS",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("score", "Resultado NPS", "ex.: 42"),
          countField("responses", "Quantidade de respostas"),
        ],
      },
      {
        code: "SATISFACTION",
        label: "Pesquisa de satisfação",
        shortLabel: "Satisfação",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("score", "Resultado", "ex.: 4.5"),
          countField("responses", "Quantidade de respostas"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "JOURNEY_RESEARCH",
        label: "Pesquisa de jornada",
        shortLabel: "Jornada",
        studyType: "QUALITATIVE",
        fields: [
          countField("participants", "Participantes"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
          countField("opportunities", "Oportunidades identificadas"),
        ],
      },
      {
        code: "CX_INTERVIEW",
        label: "Entrevista com cliente",
        shortLabel: "Entrevista",
        studyType: "QUALITATIVE",
        fields: [
          countField("participants", "Entrevistas"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
    ],
  },
  {
    code: "UX",
    label: "UX — User Experience",
    shortLabel: "UX",
    studyTypes: ["QUALITATIVE", "QUANTITATIVE", "EXPERT"],
    methods: [
      {
        code: "USABILITY_TEST",
        label: "Teste de Usabilidade",
        shortLabel: "Usabilidade",
        studyType: "QUALITATIVE",
        fields: [
          countField("participants", "Participantes"),
          { key: "tasks", label: "Tarefas avaliadas", kind: "textarea" },
          countField("critical", "Problemas críticos"),
          countField("high", "Problemas altos"),
          countField("medium", "Problemas médios"),
          countField("low", "Problemas baixos"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "SUS",
        label: "SUS — System Usability Scale",
        shortLabel: "SUS",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("score", "Score SUS", "ex.: 72"),
          countField("participants", "Participantes"),
        ],
      },
      {
        code: "HEURISTIC",
        label: "Avaliação Heurística",
        shortLabel: "Heurística",
        studyType: "EXPERT",
        fields: [
          countField("critical", "Críticas"),
          countField("high", "Altas"),
          countField("medium", "Médias"),
          countField("low", "Baixas"),
          countField("opportunities", "Oportunidades (total)"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "UX_INTERVIEW",
        label: "Entrevista com usuário",
        shortLabel: "Entrevista",
        studyType: "QUALITATIVE",
        fields: [
          countField("participants", "Entrevistas"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "CARD_SORTING",
        label: "Card Sorting",
        shortLabel: "Card Sorting",
        studyType: "QUALITATIVE",
        fields: [
          countField("participants", "Participantes"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "TREE_TESTING",
        label: "Tree Testing",
        shortLabel: "Tree Testing",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("success_rate", "Taxa de sucesso (%)"),
          countField("participants", "Participantes"),
        ],
      },
      {
        code: "FIRST_CLICK",
        label: "First Click Test",
        shortLabel: "First Click",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("success_rate", "Taxa de acerto (%)"),
          countField("participants", "Participantes"),
        ],
      },
      {
        code: "FLOW_EVAL",
        label: "Avaliação de fluxo/jornada",
        shortLabel: "Fluxo",
        studyType: "EXPERT",
        fields: [
          countField("opportunities", "Oportunidades"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
    ],
  },
  {
    code: "UI",
    label: "UI — User Interface",
    shortLabel: "UI",
    studyTypes: ["VISUAL", "EXPERT"],
    methods: [
      {
        code: "VISUAL_REVIEW",
        label: "Avaliação Visual",
        shortLabel: "Visual",
        studyType: "VISUAL",
        fields: [
          countField("opportunities", "Oportunidades"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "DESIGN_SYSTEM",
        label: "Avaliação de Design System",
        shortLabel: "Design System",
        studyType: "EXPERT",
        fields: [
          countField("inconsistencies", "Inconsistências"),
          countField("opportunities", "Oportunidades"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "RESPONSIVE",
        label: "Avaliação de responsividade",
        shortLabel: "Responsividade",
        studyType: "EXPERT",
        fields: [
          countField("breakpoints_issues", "Problemas por breakpoint"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
    ],
  },
  {
    code: "ACCESSIBILITY",
    label: "Acessibilidade",
    shortLabel: "A11y",
    studyTypes: ["EXPERT"],
    methods: [
      {
        code: "WCAG",
        label: "Avaliação WCAG",
        shortLabel: "WCAG",
        studyType: "EXPERT",
        fields: [
          { key: "level", label: "Nível alvo (A/AA/AAA)", kind: "text", result: true },
          countField("violations", "Violações"),
          countField("critical", "Críticas"),
        ],
      },
      {
        code: "KEYBOARD",
        label: "Navegação por teclado",
        shortLabel: "Teclado",
        studyType: "EXPERT",
        fields: [
          countField("issues", "Problemas"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "SCREEN_READER",
        label: "Leitor de tela",
        shortLabel: "Leitor de tela",
        studyType: "EXPERT",
        fields: [
          countField("issues", "Problemas"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "CONTRAST",
        label: "Contraste",
        shortLabel: "Contraste",
        studyType: "EXPERT",
        fields: [
          countField("failures", "Falhas de contraste"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
    ],
  },
  {
    code: "CONTENT",
    label: "Conteúdo / UX Writing",
    shortLabel: "Conteúdo",
    studyTypes: ["EXPERT", "QUALITATIVE"],
    methods: [
      {
        code: "UX_WRITING",
        label: "Avaliação de UX Writing",
        shortLabel: "UX Writing",
        studyType: "EXPERT",
        fields: [
          countField("opportunities", "Oportunidades"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "CLARITY",
        label: "Clareza de conteúdo",
        shortLabel: "Clareza",
        studyType: "EXPERT",
        fields: [
          scoreField("score", "Nota de clareza", "1–5"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "TONE",
        label: "Tom de voz",
        shortLabel: "Tom de voz",
        studyType: "EXPERT",
        fields: [
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "COMPREHENSION",
        label: "Compreensão",
        shortLabel: "Compreensão",
        studyType: "QUALITATIVE",
        fields: [
          countField("participants", "Participantes"),
          scoreField("success_rate", "Taxa de compreensão (%)"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
    ],
  },
  {
    code: "DATA",
    label: "Dados / Analytics",
    shortLabel: "Dados",
    studyTypes: ["BEHAVIORAL", "QUANTITATIVE"],
    methods: [
      {
        code: "ANALYTICS",
        label: "Analytics",
        shortLabel: "Analytics",
        studyType: "QUANTITATIVE",
        fields: [
          { key: "metric", label: "Métrica principal", kind: "text", result: true },
          { key: "value", label: "Valor", kind: "text", result: true },
          { key: "findings", label: "Interpretação", kind: "textarea" },
        ],
      },
      {
        code: "MS_CLARITY",
        label: "Microsoft Clarity",
        shortLabel: "Clarity",
        studyType: "BEHAVIORAL",
        fields: [
          countField("sessions", "Sessões analisadas"),
          countField("rage_clicks", "Rage clicks / fricções"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "HOTJAR",
        label: "Hotjar",
        shortLabel: "Hotjar",
        studyType: "BEHAVIORAL",
        fields: [
          countField("sessions", "Sessões / heatmaps"),
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
      {
        code: "FUNNEL",
        label: "Funil de conversão",
        shortLabel: "Funil",
        studyType: "QUANTITATIVE",
        fields: [
          scoreField("conversion_rate", "Taxa de conversão (%)"),
          { key: "dropoff", label: "Principal abandono", kind: "text", result: true },
          { key: "findings", label: "Principais achados", kind: "textarea" },
        ],
      },
      {
        code: "BEHAVIORAL",
        label: "Análise comportamental",
        shortLabel: "Comportamental",
        studyType: "BEHAVIORAL",
        fields: [
          { key: "findings", label: "Principais achados", kind: "textarea", result: true },
        ],
      },
    ],
  },
];

/** Método especial para avaliações fora do catálogo. */
export const CUSTOM_METHOD: EvaluationMethodDef = {
  code: "CUSTOM",
  label: "Outra avaliação",
  shortLabel: "Personalizada",
  studyType: "CUSTOM",
  fields: [
    { key: "result_summary", label: "Resultado", kind: "text", result: true },
    { key: "findings", label: "Principais achados", kind: "textarea", result: true },
  ],
};

export function getArea(code: string | null | undefined) {
  return EVALUATION_AREAS.find((a) => a.code === code);
}

export function getMethod(
  areaCode: string | null | undefined,
  methodCode: string | null | undefined,
) {
  if (methodCode === "CUSTOM" || methodCode === "OTHER") return CUSTOM_METHOD;
  return getArea(areaCode)?.methods.find((m) => m.code === methodCode);
}

export function studyTypesForArea(areaCode: string) {
  const area = getArea(areaCode);
  if (!area) return [];
  return area.studyTypes.map((code) => ({
    code,
    label: STUDY_TYPE_LABEL[code],
  }));
}

export function methodsForAreaAndStudy(
  areaCode: string,
  studyType: string | null,
) {
  const area = getArea(areaCode);
  if (!area) return [];
  if (!studyType) return area.methods;
  return area.methods.filter((m) => m.studyType === studyType);
}

/** Linhas curtas de resultado para card / lista. */
export function formatEvaluationResultLines(
  areaCode: string,
  methodCode: string,
  results: Record<string, unknown> | null | undefined,
  customName?: string | null,
): string[] {
  const r = results ?? {};
  const method = getMethod(areaCode, methodCode);
  const lines: string[] = [];

  if (methodCode === "CES" && r.score != null) {
    const scale = r.scale != null ? ` / ${r.scale}` : " / 5";
    lines.push(`${r.score}${scale}`);
    if (r.responses != null) lines.push(`${r.responses} respostas`);
    return lines;
  }
  if (methodCode === "CSAT" && r.score != null) {
    lines.push(`${r.score}%`);
    if (r.responses != null) lines.push(`${r.responses} respostas`);
    return lines;
  }
  if (methodCode === "NPS" && r.score != null) {
    const n = Number(r.score);
    lines.push(`${n > 0 ? "+" : ""}${r.score}`);
    if (r.responses != null) lines.push(`${r.responses} respostas`);
    return lines;
  }
  if (methodCode === "USABILITY_TEST") {
    if (r.participants != null) lines.push(`${r.participants} participantes`);
    const crit = r.critical ?? r.findings_critical;
    const high = r.high ?? r.findings_high;
    if (crit != null) lines.push(`${crit} críticos`);
    else if (r.findings_count != null) lines.push(`${r.findings_count} achados`);
    if (high != null) lines.push(`${high} altos`);
    return lines.length ? lines : fallbackResultLines(method, r, customName);
  }
  if (methodCode === "HEURISTIC") {
    if (r.opportunities != null) lines.push(`${r.opportunities} oportunidades`);
    if (r.critical != null) lines.push(`${r.critical} críticas`);
    return lines.length ? lines : fallbackResultLines(method, r, customName);
  }

  return fallbackResultLines(method, r, customName);
}

function fallbackResultLines(
  method: EvaluationMethodDef | undefined,
  r: Record<string, unknown>,
  customName?: string | null,
): string[] {
  const lines: string[] = [];
  if (customName) lines.push(customName);
  const resultFields = method?.fields.filter((f) => f.result) ?? [];
  for (const f of resultFields) {
    const v = r[f.key];
    if (v == null || v === "") continue;
    if (f.kind === "textarea" || f.kind === "text") {
      const text = String(v);
      lines.push(text.length > 60 ? `${text.slice(0, 57)}…` : text);
    } else {
      lines.push(`${v} · ${f.label}`);
    }
  }
  if (lines.length === 0 && r.result_summary) {
    lines.push(String(r.result_summary));
  }
  return lines.slice(0, 2);
}

export function evaluationMethodLabel(
  areaCode: string,
  methodCode: string,
  customName?: string | null,
) {
  if (methodCode === "CUSTOM" || methodCode === "OTHER") {
    return customName?.trim() || "Avaliação personalizada";
  }
  return getMethod(areaCode, methodCode)?.shortLabel ?? methodCode;
}

export function evaluationAreaLabel(areaCode: string) {
  return getArea(areaCode)?.shortLabel ?? areaCode;
}

// silence unused
void commonMetaFields;
