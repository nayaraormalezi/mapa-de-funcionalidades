import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>
    </Button>
  );
}
