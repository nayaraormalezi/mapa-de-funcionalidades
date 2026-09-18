/**
 * Utilitários de período (Relatórios / Gestão de entregas).
 *
 * mode "all" = sem limite temporal (todo o histórico disponível).
 * mode "custom" = intervalo start/end inclusivo (YYYY-MM-DD).
 *
 * Sem snapshots históricos de cobertura/fase: o período custom só “tem resultado”
 * quando inclui o dia de hoje (métricas de estado atual) ou quando existem
 * eventos datados no intervalo. "Todo o período" sempre inclui o estado atual.
 */

export type PeriodMode = "all" | "custom";

export type DateRange = {
  mode: PeriodMode;
  /** YYYY-MM-DD (inclusive). Null quando mode = "all". */
  start: string | null;
  /** YYYY-MM-DD (inclusive). Null quando mode = "all". */
  end: string | null;
};

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatBR(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function isAllPeriod(range: DateRange): boolean {
  return range.mode === "all";
}

export function allPeriodRange(): DateRange {
  return { mode: "all", start: null, end: null };
}

export function customPeriodRange(start: string, end: string): DateRange {
  return { mode: "custom", start, end };
}

/** Rótulo amigável — nunca inventa datas para "Todo o período". */
export function formatRangeBR(range: DateRange): string {
  if (isAllPeriod(range)) return "Todo o período";
  if (!range.start || !range.end) return "Período personalizado";
  return `${formatBR(range.start)} — ${formatBR(range.end)}`;
}

/**
 * Fallback ao abrir "Período personalizado" (último ~3 meses até hoje).
 * O default de produto na UI é `allPeriodRange()` — Todo o período.
 */
export function defaultPeriodRange(now = new Date()): DateRange {
  const end = now;
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return customPeriodRange(toISODate(start), toISODate(end));
}

export function validateDateRange(
  range: DateRange,
  opts?: { allowFuture?: boolean; today?: string },
): string | null {
  if (isAllPeriod(range)) return null;
  if (!range.start || !range.end) return "Selecione data inicial e final.";
  if (range.start > range.end) {
    return "A data inicial não pode ser posterior à data final.";
  }
  const today = opts?.today ?? toISODate(new Date());
  if (!opts?.allowFuture && range.start > today) {
    return "Não há dados futuros disponíveis. Escolha uma data inicial até hoje.";
  }
  if (!opts?.allowFuture && range.end > today) {
    return "A data final não pode ser futura.";
  }
  return null;
}

/** Dias inclusivos no intervalo. Null quando mode = all. */
export function rangeDayCount(range: DateRange): number | null {
  if (isAllPeriod(range) || !range.start || !range.end) return null;
  const a = parseISODate(range.start).getTime();
  const b = parseISODate(range.end).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

/**
 * Comparação direta exige dois intervalos custom de mesma duração.
 * "Todo o período" não é comparável — não inventa datas equivalentes.
 */
export function validateComparison(
  primary: DateRange,
  compare: DateRange,
): string | null {
  if (isAllPeriod(primary) || isAllPeriod(compare)) {
    return "Não é possível comparar quando um dos períodos é «Todo o período». Selecione períodos personalizados equivalentes (mesmo número de dias).";
  }
  const err = validateDateRange(compare);
  if (err) return err;
  const primaryDays = rangeDayCount(primary);
  const compareDays = rangeDayCount(compare);
  if (primaryDays == null || compareDays == null) {
    return "Selecione data inicial e final nos dois períodos.";
  }
  if (primaryDays !== compareDays) {
    return "Não é possível comparar estes períodos diretamente. Selecione intervalos equivalentes (mesmo número de dias).";
  }
  return null;
}

export function periodIncludesToday(
  range: DateRange,
  today = toISODate(new Date()),
): boolean {
  if (isAllPeriod(range)) return true;
  if (!range.start || !range.end) return false;
  return range.start <= today && range.end >= today;
}

export function dateInRange(
  iso: string | null | undefined,
  range: DateRange,
): boolean {
  if (!iso) return false;
  if (isAllPeriod(range)) return true;
  if (!range.start || !range.end) return false;
  const day = iso.slice(0, 10);
  return day >= range.start && day <= range.end;
}

export type TemporalEvent = {
  id: string;
  kind: "evaluation" | "evolution" | "fcc_date";
  date: string;
  label: string;
};

export function eventsInRange(
  events: TemporalEvent[],
  range: DateRange,
): TemporalEvent[] {
  return events.filter((e) => dateInRange(e.date, range));
}

/**
 * Há resultado para o período se:
 * - o intervalo inclui hoje / é "Todo o período" (métricas de estado atual), OU
 * - existem eventos temporais no intervalo.
 */
export function periodHasReportResults(
  range: DateRange,
  events: TemporalEvent[],
  today = toISODate(new Date()),
): boolean {
  if (periodIncludesToday(range, today)) return true;
  return eventsInRange(events, range).length > 0;
}

export function deltaAbsolute(
  current: number,
  previous: number | null,
): number | null {
  if (previous == null) return null;
  return current - previous;
}

/** Diferença em pontos percentuais (não percentual relativo). */
export function deltaPercentagePoints(
  currentPct: number | null,
  previousPct: number | null,
): number | null {
  if (currentPct == null || previousPct == null) return null;
  return currentPct - previousPct;
}
