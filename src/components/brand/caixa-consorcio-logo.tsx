import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logotipo oficial CAIXA Consórcio (SVG). */
export function CaixaConsorcioLogo({
  className,
  compact = false,
}: {
  className?: string;
  /** Monograma do X para sidebar recolhida. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <svg
        viewBox="0 0 42 36"
        className={cn("h-8 w-auto", className)}
        role="img"
        aria-label="CAIXA Consórcio"
      >
        <title>CAIXA Consórcio</title>
        <path d="M2 2 L14 2 L30 34 L18 34 Z" fill="#FFFFFF" />
        <path d="M28 2 L40 2 L24 34 L12 34 Z" fill="#F39200" />
      </svg>
    );
  }

  return (
    <Image
      src="/logo-caixa-consorcio.svg"
      alt="CAIXA Consórcio"
      width={140}
      height={65}
      priority
      className={cn("h-11 w-auto object-contain object-left", className)}
    />
  );
}
