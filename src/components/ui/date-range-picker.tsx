"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  allPeriodRange,
  customPeriodRange,
  defaultPeriodRange,
  formatBR,
  formatRangeBR,
  isAllPeriod,
  toISODate,
  type DateRange,
  validateDateRange,
} from "@/lib/report-period";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function monthMatrix(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function MonthGrid({
  view,
  range,
  hover,
  onPick,
  onViewChange,
  maxDate,
}: {
  view: { year: number; month: number };
  range: { start: string | null; end: string | null };
  hover: string | null;
  onPick: (iso: string) => void;
  onViewChange: (year: number, month: number) => void;
  maxDate: string;
}) {
  const title = new Date(view.year, view.month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const rows = monthMatrix(view.year, view.month);

  const previewEnd =
    range.start && !range.end && hover && hover >= range.start
      ? hover
      : range.end;

  return (
    <div className="w-[240px]">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Mês anterior"
          onClick={() => {
            const d = new Date(view.year, view.month - 1, 1);
            onViewChange(d.getFullYear(), d.getMonth());
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium capitalize text-slate-800">{title}</p>
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          aria-label="Próximo mês"
          onClick={() => {
            const d = new Date(view.year, view.month + 1, 1);
            onViewChange(d.getFullYear(), d.getMonth());
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-slate-400">
        {WEEKDAYS.map((w, i) => (
          <span key={`${w}-${i}`}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {rows.flatMap((row, ri) =>
          row.map((day, di) => {
            if (day == null) {
              return <span key={`${ri}-${di}`} className="h-8" />;
            }
            const iso = toISODate(new Date(view.year, view.month, day));
            const disabled = iso > maxDate;
            const isStart = range.start === iso;
            const isEnd = (previewEnd ?? range.end) === iso;
            const inRange =
              range.start &&
              previewEnd &&
              iso >= range.start &&
              iso <= previewEnd;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                onClick={() => onPick(iso)}
                className={cn(
                  "h-8 rounded-md text-xs tabular-nums transition-colors",
                  disabled && "cursor-not-allowed text-slate-300",
                  !disabled && "hover:bg-[var(--brand-soft)]",
                  inRange && !isStart && !isEnd && "bg-slate-100",
                  (isStart || isEnd) &&
                    "bg-[var(--brand)] font-semibold text-white hover:bg-[var(--brand)]",
                )}
              >
                {day}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

/**
 * Seletor de período — Todo o período | Período personalizado (calendário).
 */
export function DateRangePicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: DateRange;
  onChange: (next: DateRange) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"menu" | "calendar">(
    isAllPeriod(value) ? "menu" : "calendar",
  );
  const [draftStart, setDraftStart] = useState<string | null>(value.start);
  const [draftEnd, setDraftEnd] = useState<string | null>(value.end);
  const [hover, setHover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const today = toISODate(new Date());

  const initialView = useMemo(() => {
    const seed = value.start ?? defaultPeriodRange().start!;
    const d = new Date(seed + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [value.start]);

  const [left, setLeft] = useState(initialView);
  const [right, setRight] = useState(() => {
    const d = new Date(initialView.year, initialView.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    if (!open) return;
    setPanelMode(isAllPeriod(value) ? "menu" : "calendar");
    setDraftStart(value.start);
    setDraftEnd(value.end);
    setError(null);
  }, [open, value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(iso: string) {
    setHover(iso);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(iso);
      setDraftEnd(null);
      return;
    }
    if (iso < draftStart) {
      setDraftStart(iso);
      setDraftEnd(null);
      return;
    }
    setDraftEnd(iso);
  }

  function selectAll() {
    onChange(allPeriodRange());
    setOpen(false);
  }

  function openCustomCalendar() {
    setPanelMode("calendar");
    if (!draftStart || !draftEnd) {
      const fallback = defaultPeriodRange();
      setDraftStart(fallback.start);
      setDraftEnd(fallback.end);
    }
    setError(null);
  }

  function applyCustom() {
    if (!draftStart || !draftEnd) {
      setError("Selecione data inicial e final.");
      return;
    }
    const next = customPeriodRange(draftStart, draftEnd);
    const err = validateDateRange(next, { today });
    if (err) {
      setError(err);
      return;
    }
    onChange(next);
    setOpen(false);
  }

  const triggerLabel = formatRangeBR(value);

  return (
    <div ref={rootRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-9 min-w-[220px] items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-slate-800",
          "hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span
          className={cn(
            "flex-1 text-left",
            !isAllPeriod(value) && "tabular-nums",
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute top-[calc(100%+6px)] left-0 z-50 rounded-xl border border-[var(--border)] bg-white p-3 shadow-[var(--shadow-md)]"
        >
          {panelMode === "menu" ? (
            <div className="min-w-[220px] space-y-1">
              <button
                type="button"
                role="option"
                aria-selected={isAllPeriod(value)}
                onClick={selectAll}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  isAllPeriod(value)
                    ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                    : "text-slate-800 hover:bg-slate-50",
                )}
              >
                Todo o período
                {isAllPeriod(value) ? (
                  <span className="text-xs" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                role="option"
                aria-selected={!isAllPeriod(value)}
                onClick={openCustomCalendar}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  !isAllPeriod(value)
                    ? "bg-[var(--brand-soft)] font-medium text-[var(--brand)]"
                    : "text-slate-800 hover:bg-slate-50",
                )}
              >
                Período personalizado
                {!isAllPeriod(value) ? (
                  <span className="text-xs" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
                <button
                  type="button"
                  onClick={() => setPanelMode("menu")}
                  className="text-xs font-medium text-[var(--brand)] hover:underline"
                >
                  ← Opções de período
                </button>
                <p className="text-xs text-slate-500">Período personalizado</p>
              </div>
              <div className="mb-3 flex flex-wrap gap-6">
                <div onMouseLeave={() => setHover(null)}>
                  <MonthGrid
                    view={left}
                    range={{ start: draftStart, end: draftEnd }}
                    hover={hover}
                    onPick={pick}
                    onViewChange={(y, m) => setLeft({ year: y, month: m })}
                    maxDate={today}
                  />
                </div>
                <MonthGrid
                  view={right}
                  range={{ start: draftStart, end: draftEnd }}
                  hover={hover}
                  onPick={pick}
                  onViewChange={(y, m) => setRight({ year: y, month: m })}
                  maxDate={today}
                />
              </div>
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <span>
                  Início:{" "}
                  <strong className="tabular-nums">
                    {draftStart ? formatBR(draftStart) : "—"}
                  </strong>
                </span>
                <span>
                  Fim:{" "}
                  <strong className="tabular-nums">
                    {draftEnd ? formatBR(draftEnd) : "—"}
                  </strong>
                </span>
              </div>
              {error ? (
                <p className="mb-2 text-xs text-rose-700" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={applyCustom}>
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
