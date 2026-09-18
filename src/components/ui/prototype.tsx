import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

/** Item de breadcrumb. Sem `href` = página atual (não clicável). */
export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/** Trilha navegável padronizada (›). */
export function PageBreadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn(className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-[var(--muted-foreground)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-x-1.5">
              {index > 0 ? (
                <span aria-hidden className="text-[var(--muted-foreground)]/60">
                  ›
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-[var(--brand)] hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-slate-600" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  breadcrumb,
  title,
  description,
  callout,
  leading,
  actions,
}: {
  /** Trilha funcional. String legada ainda aceita (sem links). */
  breadcrumb?: string | BreadcrumbItem[];
  title: string;
  description?: string;
  callout?: { title: string; body: string; icon?: LucideIcon };
  /** Controles à esquerda, acima do título (ex.: Voltar). */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const CalloutIcon = callout?.icon;
  const crumbs: BreadcrumbItem[] | null = !breadcrumb
    ? null
    : typeof breadcrumb === "string"
      ? [{ label: breadcrumb }]
      : breadcrumb;

  return (
    <div className="mb-5 space-y-4">
      {leading ? (
        <div className="flex flex-wrap items-center gap-3">{leading}</div>
      ) : null}
      {crumbs ? <PageBreadcrumb items={crumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-semibold tracking-tight text-[#111827] md:text-[28px]">
          {title}
        </h1>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {(description || callout) && (
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          {description ? (
            <p className="max-w-3xl flex-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {description}
            </p>
          ) : (
            <div className="flex-1" />
          )}
          {callout ? (
            <div className="flex max-w-sm shrink-0 gap-3 rounded-xl border border-[#b3d4eb] bg-[#e6f0f7] px-4 py-3 shadow-[var(--shadow-sm)]">
              {CalloutIcon ? (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand)]">
                  <CalloutIcon className="h-4 w-4" />
                </div>
              ) : null}
              <div>
                <p className="text-sm font-semibold text-[#005ca9]">
                  {callout.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#005ca9]/80">
                  {callout.body}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function SurfaceCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  trend,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  trend?: string;
}) {
  const tones = {
    default: "border-b-slate-200",
    success: "border-b-emerald-400",
    warning: "border-b-amber-400",
    danger: "border-b-rose-400",
    info: "border-b-[var(--brand)]",
    accent: "border-b-violet-400",
  };
  const iconTone = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-rose-50 text-rose-600",
    info: "bg-[var(--brand-soft)] text-[var(--brand)]",
    accent: "bg-violet-50 text-violet-600",
  };

  return (
    <SurfaceCard className={cn("border-b-4 p-4", tones[tone])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</p>
          ) : null}
          {trend ? (
            <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconTone[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-100",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full bg-[var(--brand)]", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    const selected =
      options.find((o) => o.value === value)?.label ?? options[0]?.label ?? "";
    return (
      <label className={cn("relative inline-flex min-w-0", className)}>
        <span className="sr-only">{label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-full border border-[var(--border)] bg-white py-1.5 pr-8 pl-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {label}: {opt.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-slate-400"
        >
          ▾
        </span>
        <span className="sr-only">
          {label}: {selected}
        </span>
      </label>
    );
  }

  return (
    <label className={cn("block min-w-[140px] text-xs", className)}>
      <span className="mb-1 block font-medium text-[var(--muted-foreground)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[var(--brand-ring)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Compact chip showing "Label: Value" as a single control. */
export function FilterChip({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const active = value !== "";
  return (
    <label
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
        active
          ? "border-[var(--brand-ring)] bg-[var(--brand-soft)] text-[var(--brand)]"
          : "border-[var(--border)] bg-white text-slate-700 hover:bg-slate-50",
        className,
      )}
    >
      <span className="font-medium text-slate-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[140px] cursor-pointer appearance-none bg-transparent pr-4 font-semibold text-slate-800 outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {active ? (
        <button
          type="button"
          aria-label={`Limpar ${label}`}
          className="-mr-1 rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
          onClick={(e) => {
            e.preventDefault();
            onChange("");
          }}
        >
          <X className="h-3 w-3" />
        </button>
      ) : (
        <span aria-hidden className="text-[10px] text-slate-400">
          ▾
        </span>
      )}
    </label>
  );
}

export function StatusDotBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1",
        className,
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          {opt.label}
          {typeof opt.count === "number" ? (
            <span className="ml-1.5 tabular-nums text-slate-400">
              {opt.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** Underlined text tabs (Figma Make map/gaps views). */
export function UnderlineTabs({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 border-b border-[var(--border)]",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-slate-800",
            )}
          >
            {opt.label}
            {typeof opt.count === "number" ? (
              <span className="ml-1.5 tabular-nums text-slate-400">
                ({opt.count})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function ModalShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button
        type="button"
        className="fixed inset-0 bg-slate-950/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 mt-8 w-full rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)]",
          widthClassName,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
