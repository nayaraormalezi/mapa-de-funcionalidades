"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

type MomentChannels = {
  momentName: string;
  current: string[];
  future: string[];
};

type Tab = {
  id: string;
  label: string;
  moments: MomentChannels[];
};

export function DashboardChannelTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  if (!tabs.length || !current) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Nenhum canal mapeado.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "bg-[var(--sidebar)] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px] font-medium text-slate-400">
        <span>Hoje (canais atuais)</span>
        <span className="w-4" />
        <span className="text-[var(--brand)]">Em breve (canais futuros)</span>
      </div>

      <div className="space-y-4">
        {current.moments.map((moment) => (
          <div key={moment.momentName}>
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {moment.momentName}
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <ChannelPills names={moment.current} tone="current" />
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              <ChannelPills names={moment.future} tone="future" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelPills({
  names,
  tone,
}: {
  names: string[];
  tone: "current" | "future";
}) {
  if (names.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((name) => (
        <span
          key={name}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs font-medium",
            tone === "current"
              ? "bg-[#f3f4f6] text-slate-700"
              : "bg-[#dbeafe] text-[#145fab]",
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}
