"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

/**
 * Estado explícito de falha de dados em modo LIVE.
 * Nunca apresenta KPIs/cards demo neste fluxo.
 */
export function DataLoadErrorView({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const looksLikeDb =
    error.name === "DatabaseLoadError" ||
    /não foi possível carregar os dados|supabase/i.test(error.message);

  useEffect(() => {
    console.error("[PRISMA] data load error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
        Não foi possível carregar os dados
      </h1>
      <p className="mt-2 max-w-md text-sm text-[var(--muted-foreground)]">
        {looksLikeDb
          ? "Houve um problema de conexão ou carregamento com o Supabase. Os dados demonstrativos não são exibidos no modo LIVE."
          : "Ocorreu um erro ao carregar esta página. Tente novamente."}
      </p>
      {error.message ? (
        <p className="mt-3 max-w-lg rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
          {error.message.slice(0, 280)}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#005CA9] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        Tentar novamente
      </button>
    </div>
  );
}
