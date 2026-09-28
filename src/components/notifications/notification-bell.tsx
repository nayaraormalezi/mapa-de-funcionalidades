"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  countUnreadNotifications,
  listRecentNotifications,
  markNotificationRead,
  type NotificationDTO,
} from "@/app/actions/notifications";
import { formatRelativeTime } from "@/lib/notifications/catalog";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const [count, recent] = await Promise.all([
      countUnreadNotifications(),
      listRecentNotifications(8),
    ]);
    setUnread(count);
    if ("notifications" in recent && recent.ok) {
      setItems(recent.notifications);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 60_000);
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  function openNotification(item: NotificationDTO) {
    startTransition(async () => {
      if (!item.readAt) {
        await markNotificationRead(item.id);
        await refresh();
      }
      setOpen(false);
      if (item.href) router.push(item.href);
    });
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          unread > 0
            ? `Notificações, ${unread} não lidas`
            : "Notificações"
        }
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <Bell className="h-4.5 w-4.5" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#4a8fc4] px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[var(--shadow-md)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3.5 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Notificações</p>
            {unread > 0 ? (
              <span className="text-[11px] font-medium text-slate-500">
                {unread} não lida{unread === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-xs text-slate-500">
                Carregando…
              </p>
            ) : items.length === 0 ? (
              <div className="px-3.5 py-8 text-center">
                <p className="text-sm font-medium text-slate-800">
                  Nenhuma notificação
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Quando algo importante acontecer no PRISMA, suas notificações
                  aparecerão aqui.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => {
                  const unreadItem = !item.readAt;
                  const actorName = item.actor?.fullName ?? "Alguém";
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => openNotification(item)}
                        className={cn(
                          "flex w-full gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-slate-50",
                          unreadItem && "bg-sky-50/50",
                        )}
                      >
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600"
                          aria-hidden
                        >
                          {initials(actorName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-1.5">
                            {unreadItem ? (
                              <span
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a8fc4]"
                                aria-label="Não lida"
                              />
                            ) : null}
                            <span className="min-w-0 text-sm text-slate-800">
                              <span className="font-semibold">{actorName}</span>{" "}
                              {item.title}
                            </span>
                          </span>
                          {item.message ? (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              “{item.message}”
                            </span>
                          ) : null}
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-[var(--border)] px-3.5 py-2">
            <Link
              href="/notificacoes"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-[var(--brand)] hover:underline"
            >
              Mostrar tudo →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
