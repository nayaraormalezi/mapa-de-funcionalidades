"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  GitBranch,
  Home,
  Layers,
  Lightbulb,
  LogOut,
  Menu,
  Radio,
  Route,
  Settings,
  X,
  ChevronDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { logoutAction } from "@/app/actions/auth";
import { CaixaConsorcioLogo } from "@/components/brand/caixa-consorcio-logo";
import {
  GlobalSearchBar,
  type GlobalSearchItem,
} from "@/components/layout/global-search";
import { NotificationBell } from "@/components/notifications/notification-bell";

type NavBadge = { type: "count"; value: number } | { type: "new" };

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: NavBadge;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const navSections = (gapsBadgeCount: number): NavSection[] => [
  {
    id: "principal",
    label: "Principal",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: Home },
      { href: "/mapa", label: "Funcionalidades", icon: BookOpen },
      { href: "/jornadas", label: "Jornadas", icon: Route },
      { href: "/roadmap", label: "Gestão de entregas", icon: GitBranch },
      {
        href: "/gaps",
        label: "Melhorias",
        icon: Lightbulb,
        badge:
          gapsBadgeCount > 0
            ? { type: "count", value: gapsBadgeCount }
            : undefined,
      },
    ],
  },
  {
    id: "ecossistema",
    label: "Ecossistema",
    items: [
      { href: "/canais", label: "Canais", icon: Radio },
      { href: "/produtos", label: "Produtos", icon: Layers },
    ],
  },
  {
    id: "analises",
    label: "Análises",
    items: [
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      {
        href: "/inteligencia",
        label: "Inteligência",
        icon: Lightbulb,
      },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

function initials(name: string | null | undefined) {
  if (!name) return "UX";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function NavBadgeView({ badge, collapsed }: { badge: NavBadge; collapsed?: boolean }) {
  if (badge.type === "count") {
    if (badge.value <= 0) return null;
    return (
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4a8fc4] px-1.5 text-[10px] font-semibold text-white",
          collapsed && "absolute -top-1 -right-1 h-4 min-w-4 px-1",
        )}
      >
        {badge.value > 99 ? "99+" : badge.value}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-md bg-[#4a8fc4] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase",
        collapsed && "absolute -top-1 -right-1 px-1 text-[8px]",
      )}
    >
      Novo
    </span>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  badge?: NavBadge;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg text-[13px] transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        active
          ? "bg-white/15 font-medium text-white"
          : "text-white/75 hover:bg-white/8 hover:text-white",
      )}
    >
      {active ? (
        <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r bg-[var(--sidebar-accent-bar)]" />
      ) : null}
      <span className="relative shrink-0">
        <Icon className="h-4 w-4 opacity-90" />
        {collapsed && badge ? <NavBadgeView badge={badge} collapsed /> : null}
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 leading-tight">{label}</span>
          {badge ? <NavBadgeView badge={badge} /> : null}
        </>
      ) : null}
    </Link>
  );
}

export function AppShell({
  children,
  gapsBadgeCount = 0,
  searchItems = [],
  dataMode = "DEMO",
}: {
  children: React.ReactNode;
  gapsBadgeCount?: number;
  searchItems?: GlobalSearchItem[];
  dataMode?: "LIVE" | "DEMO";
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const auth = useAuth();
  const sections = useMemo(
    () => navSections(gapsBadgeCount),
    [gapsBadgeCount],
  );

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

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[240px]";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[width,transform] duration-200 lg:static lg:translate-x-0",
          sidebarWidth,
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "border-b border-white/10 py-4",
            collapsed
              ? "flex flex-col items-center gap-2 px-2"
              : "flex items-center gap-2 px-4",
          )}
        >
          {collapsed ? (
            <CaixaConsorcioLogo compact />
          ) : (
            <div className="min-w-0 flex-1">
              <CaixaConsorcioLogo />
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#004785] text-white hover:bg-[#003f75] lg:inline-flex"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-3">
          {sections.map((section, index) => (
            <div key={section.id}>
              {index > 0 ? (
                <div className="mb-3 border-t border-white/10" />
              ) : null}
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-[0.14em] text-white/45 uppercase">
                  {section.label}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-white px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <div className="min-w-0 flex-1">
            <GlobalSearchBar items={searchItems} />
          </div>

          {dataMode === "DEMO" ? (
            <span
              className="shrink-0 rounded-md border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-900 uppercase"
              title="Os dados exibidos são demonstrativos (demo-data), não vêm do Supabase."
            >
              Modo demonstração
            </span>
          ) : null}

          <NotificationBell />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4a8fc4] text-xs font-semibold text-white">
                {initials(displayName)}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[160px] truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  CAIXA Consórcio
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "hidden h-4 w-4 shrink-0 text-slate-400 transition-transform sm:block",
                  profileOpen && "rotate-180",
                )}
              />
            </button>

            {profileOpen ? (
              <div
                role="menu"
                className="absolute top-[calc(100%+6px)] right-0 z-40 min-w-[180px] rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-[var(--shadow-md)]"
              >
                <Link
                  href="/configuracoes"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Configurações
                </Link>
                {auth.supabaseEnabled ? (
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sair
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto p-5 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
