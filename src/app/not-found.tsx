import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold">
        Página não encontrada
      </h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        O recurso solicitado não existe nos dados DEMO.
      </p>
      <Button asChild>
        <Link href="/dashboard">Ir para o Dashboard</Link>
      </Button>
    </div>
  );
}
