"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Radio, Route, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type GlobalSearchItem = {
  id: string;
  type: "feature" | "journey" | "channel";
  label: string;
  subtitle?: string;
  href: string;
};

const TYPE_META: Record<
  GlobalSearchItem["type"],
  { label: string; icon: typeof Search }
> = {
  feature: { label: "Funcionalidade", icon: BookOpen },
  journey: { label: "Jornada", icon: Route },
  channel: { label: "Canal", icon: Radio },
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function GlobalSearchBar({ items }: { items: GlobalSearchItem[] }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(() => {
    const q = normalize(deferredQuery);
    if (q.length < 2) return [];

    return items
      .map((item) => {
        const haystack = normalize(
          `${item.label} ${item.subtitle ?? ""} ${TYPE_META[item.type].label}`,
        );
        const score = haystack.includes(q)
          ? haystack.startsWith(q)
            ? 0
            : 1
          : item.label
                .split(/\s+/)
                .some((part) => normalize(part).startsWith(q))
            ? 2
            : -1;
        return { item, score };
      })
      .filter((row) => row.score >= 0)
      .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 12)
      .map((row) => row.item);
  }, [deferredQuery, items]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goTo(item: GlobalSearchItem) {
    setOpen(false);
    setQuery("");
    router.push(item.href);
  }

  const showPanel = open && normalize(query).length >= 2;

  return (
    <div ref={rootRef} className="relative w-full max-w-xl flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!showPanel) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            const target = results[activeIndex];
            if (target) goTo(target);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Buscar funcionalidades, jornadas, canais..."
        className="h-10 w-full rounded-full border border-[var(--border)] bg-[#f5f5f5] pr-4 pl-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--brand-ring)]"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
      />

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)]"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
              Nenhum resultado para “{query.trim()}”.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((item, index) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                const active = index === activeIndex;
                return (
                  <li key={`${item.type}-${item.id}`} role="option" aria-selected={active}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
                        active ? "bg-[var(--brand-soft)]" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--muted-foreground)]">
                          {meta.label}
                          {item.subtitle ? ` · ${item.subtitle}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
