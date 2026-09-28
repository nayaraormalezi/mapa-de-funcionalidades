"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listMyNotificationPreferences,
  updateMyNotificationPreference,
} from "@/app/actions/notifications";
import {
  NOTIFICATION_PREFERENCE_GROUPS,
  type NotificationType,
} from "@/lib/notifications/catalog";
import { cn } from "@/lib/utils";

export function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<Record<NotificationType, boolean> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void listMyNotificationPreferences().then((result) => {
      if ("preferences" in result && result.ok) {
        setPrefs(result.preferences);
      } else if ("message" in result) {
        setError(result.message);
      }
    });
  }, []);

  function toggle(type: NotificationType, enabled: boolean) {
    if (!prefs) return;
    setPrefs({ ...prefs, [type]: enabled });
    startTransition(async () => {
      const result = await updateMyNotificationPreference({ type, enabled });
      if (!result.ok) {
        setError(result.message);
        const refreshed = await listMyNotificationPreferences();
        if ("preferences" in refreshed && refreshed.ok) {
          setPrefs(refreshed.preferences);
        }
      }
    });
  }

  if (!prefs) {
    return (
      <p className="text-sm text-slate-500">
        {error ?? "Carregando preferências de notificação…"}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Quero receber notificações sobre
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          As preferências são pessoais. Notificações ficam disponíveis por 15
          dias.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}

      {NOTIFICATION_PREFERENCE_GROUPS.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
            {group.label}
          </p>
          <ul className="space-y-2">
            {group.types.map((item) => {
              const enabled = prefs[item.type] !== false;
              return (
                <li key={item.type}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm text-slate-800",
                      pending && "opacity-70",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-[var(--brand)] focus:ring-[var(--brand)]/30"
                      checked={enabled}
                      disabled={pending}
                      onChange={(e) => toggle(item.type, e.target.checked)}
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
