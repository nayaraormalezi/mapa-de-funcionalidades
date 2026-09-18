"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function TooltipProvider({
  children,
  delayDuration = 200,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 max-w-[240px] rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-md",
            "animate-in fade-in-0 zoom-in-95",
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/** Ícone de ajuda com tooltip — para labels de KPI e títulos. */
export function InfoTooltip({
  content,
  label = "Mais informações",
}: {
  content: React.ReactNode;
  label?: string;
}) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
