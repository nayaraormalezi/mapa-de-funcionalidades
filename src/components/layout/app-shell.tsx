"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bell,
  FileBarChart2,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Map,
  Menu,
  Radio,
  Route,
  Search,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { logoutAction } from "@/app/actions/auth";

const primaryNav = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/mapa", label: "Mapa de funcionalidades", icon: Map },
  { href: "/jornadas", label: "Jornadas", icon: Route },
  { href: "/roadmap", label: "Roadmap", icon: GitBranch },
  { href: "/gaps", label: "Gaps & oportunidades", icon: ShieldAlert },
];

const secondaryNav = [
  { href: "/canais", label: "Canais", icon: Radio },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const roleLabel: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

function initials(name: string | null | undefined) {
  if (!name) return "UX";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors",
        active
          ? "bg-[var(--sidebar-active)] font-medium text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white",
      )}
    >
      {active ? (
        <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r bg-[var(--sidebar-accent-bar)]" />
      ) : null}
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      <span className="leading-tight">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const auth = useAuth();

  const displayName = useMemo(
    () => auth.profile?.fullName?.trim() || auth.email || "Usuário",
    [auth.profile?.fullName, auth.email],
  );

  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/" || pathname.startsWith("/dashboard")
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[212px] flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-4 pt-5 pb-4">
          <p className="text-[15px] leading-tight font-bold tracking-tight text-white">
            CAIXA{" "}
            <span className="font-semibold text-[#f4c542]">Consórcio</span>
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-white/55">
            Mapa de Funcionalidades
            <br />
            UX + CX
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-2">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onNavigate={() => setOpen(false)}
            />
          ))}
          <div className="my-3 border-t border-white/10" />
          {secondaryNav.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>

        <div className="p-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Lightbulb className="h-4 w-4 text-[var(--sidebar-accent-bar)]" />
            </div>
            <p className="text-xs font-semibold text-white">Mais integração</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/50">
              Mais possibilidades para os nossos clientes.
            </p>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-white px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <div className="relative mx-auto hidden w-full max-w-xl flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar funcionalidades, jornadas, canais..."
              className="h-10 w-full rounded-full border border-[var(--border)] bg-[#f5f5f5] pr-4 pl-10 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--brand-ring)]"
            />
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button
              type="button"
              className="relative rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              aria-label="Notificações"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
                {initials(displayName)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="max-w-[140px] truncate text-sm font-medium leading-tight text-slate-900">
                  {displayName}
                </p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {roleLabel[auth.role] ?? auth.role} | CAIXA Consórcio
                </p>
              </div>
              {auth.supabaseEnabled ? (
                <form action={logoutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-auto p-5 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
