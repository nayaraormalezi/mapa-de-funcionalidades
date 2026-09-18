import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logotipo oficial CAIXA Consórcio. */
export function CaixaConsorcioLogo({
  className,
  compact = false,
}: {
  className?: string;
  /** Símbolo X — sidebar recolhida. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Image
        src="/logo-caixa-consorcio-x.svg"
        alt="CAIXA Consórcio"
        width={79}
        height={55}
        priority
        unoptimized
        className={cn("h-7 w-auto object-contain", className)}
      />
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
