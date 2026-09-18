"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="max-w-lg font-[family-name:var(--font-display)] text-2xl font-semibold text-slate-900 sm:text-3xl">
        Parece que essa página não foi encontrada
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
        O recurso que você está tentando acessar pode ter sido removido,
        renomeado ou não está mais disponível.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Voltar para dashboard</Link>
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Voltar para a página anterior
        </Button>
      </div>
    </div>
  );
}
