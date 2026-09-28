"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDTO,
} from "@/app/actions/notifications";
import {
  formatRelativeTime,
  notificationDayGroupLabel,
} from "@/lib/notifications/catalog";
import { formatDateTime, cn } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SurfaceCard } from "@/components/ui/prototype";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

type Filter = "all" | "unread";

export function NotificationsClient() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const load = useCallback(
    async (opts?: { append?: boolean; offset?: number }) => {
      const offset = opts?.offset ?? (opts?.append ? items.length : 0);
      const result = await listNotifications({
        unreadOnly: filter === "unread",
        limit: 40,
        offset,
      });
      if (!("notifications" in result) || !result.ok) {
        if (!opts?.append) setItems([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      setItems((prev) =>
        opts?.append ? [...prev, ...result.notifications] : result.notifications,
      );
      setHasMore(result.hasMore);
      setLoading(false);
    },
    [filter, items.length],
  );

  useEffect(() => {
    setLoading(true);
    setItems([]);
    void load({ offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const groups = useMemo(() => {
    const map = new Map<string, NotificationDTO[]>();
    for (const item of items) {
      const key = notificationDayGroupLabel(item.createdAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [items]);

  function openItem(item: NotificationDTO) {
    startTransition(async () => {
      if (!item.readAt) await markNotificationRead(item.id);
      if (item.href) router.push(item.href);
      else void load({ offset: 0 });
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      void load({ offset: 0 });
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        breadcrumb={[{ label: "Notificações" }]}
        title="Notificações"
        description="Histórico dos últimos 15 dias. Personalize o que deseja receber em Configurações."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(
            [
              { id: "all", label: "Todas" },
              { id: "unread", label: "Não lidas" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                filter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/configuracoes?tab=preferencias"
            className="text-xs font-medium text-[var(--brand)] hover:underline"
          >
            Preferências
          </Link>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || items.every((i) => i.readAt)}
            onClick={markAll}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      <SurfaceCard className="overflow-hidden p-0">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            Carregando notificações…
          </p>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Nenhuma notificação
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Quando algo importante acontecer no PRISMA, suas notificações
              aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {groups.map(([label, list]) => (
              <section key={label}>
                <h2 className="bg-slate-50 px-4 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                  {label}
                </h2>
                <ul>
                  {list.map((item) => {
                    const unread = !item.readAt;
                    const actorName = item.actor?.fullName ?? "Alguém";
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => openItem(item)}
                          className={cn(
                            "flex w-full gap-3 px-4 py-3.5 text-left hover:bg-slate-50",
                            unread && "bg-sky-50/40",
                          )}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                            {initials(actorName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-2">
                              {unread ? (
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a8fc4]" />
                              ) : (
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />
                              )}
                              <span className="min-w-0 text-sm text-slate-800">
                                <span className="font-semibold">{actorName}</span>{" "}
                                {item.title}
                              </span>
                            </span>
                            {item.message ? (
                              <span className="mt-1 block pl-3.5 text-xs text-slate-500">
                                “{item.message}”
                              </span>
                            ) : null}
                            <span className="mt-1.5 block pl-3.5 text-[11px] text-slate-400">
                              {formatRelativeTime(item.createdAt)} ·{" "}
                              {formatDateTime(item.createdAt)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SurfaceCard>

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading || pending}
            onClick={() => void load({ append: true })}
          >
            Carregar mais
          </Button>
        </div>
      ) : null}
    </div>
  );
}
