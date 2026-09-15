"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar funcionalidades, necessidades, canais…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Busca textual"
      />
    </div>
  );
}
