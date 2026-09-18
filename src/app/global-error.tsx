"use client";

import { DataLoadErrorView } from "@/components/shared/data-load-error";

/**
 * Catch errors thrown from the root layout (e.g. LIVE + Supabase down).
 * Must define its own <html>/<body> — replaces the root layout when active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-[var(--background,#f8fafc)] text-[var(--foreground,#0f172a)] antialiased">
        <DataLoadErrorView error={error} reset={reset} />
      </body>
    </html>
  );
}
