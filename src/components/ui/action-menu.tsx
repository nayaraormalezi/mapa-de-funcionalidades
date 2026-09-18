"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function ActionMenu({
  items,
  label = "Ações",
  align = "right",
  className,
}: {
  items: ActionMenuItem[];
  label?: string;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            "absolute z-40 mt-1 min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--border)] bg-white py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full px-3 py-2 text-left text-sm transition disabled:opacity-40",
                item.tone === "danger"
                  ? "text-rose-700 hover:bg-rose-50"
                  : "text-slate-700 hover:bg-slate-50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
