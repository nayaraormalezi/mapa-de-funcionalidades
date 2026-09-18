"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/inteligencia",
    label: "Visão geral",
    match: (p: string) =>
      p === "/inteligencia" || p === "/inteligencia/insights",
  },
  {
    href: "/inteligencia/comparacoes",
    label: "Comparações",
    match: (p: string) => p.startsWith("/inteligencia/comparacoes"),
  },
  {
    href: "/inteligencia/transformacoes",
    label: "Transformações",
    match: (p: string) => p.startsWith("/inteligencia/transformacoes"),
  },
] as const;

/**
 * Subnavegação do domínio Intelligence (Fase 15.5).
 * Comparações e Transformações são análises — Insights são resultados derivados.
 */
export function IntelligenceNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções de Inteligência"
      className="flex flex-wrap gap-1 border-b border-[var(--border)]"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
