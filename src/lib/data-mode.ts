/**
 * DataMode — origem explícita dos dados do PRISMA.
 *
 * LIVE  → Supabase (dados reais). Falha → erro explícito (nunca DEMO).
 * DEMO  → demo-data (só quando ativado explicitamente via env).
 *
 * Critério determinístico (não usa falha de conexão):
 * LIVE  = NEXT_PUBLIC_USE_SUPABASE=true + URL + chave presentes
 * DEMO  = caso contrário
 */

export type DataMode = "LIVE" | "DEMO";

export type DataModeEnv = {
  NEXT_PUBLIC_USE_SUPABASE?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  useSupabase?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabasePublishableKey?: string;
};

/** Resolve DataMode a partir de variáveis (testável sem process.env). */
export function resolveDataMode(env: DataModeEnv = {}): DataMode {
  const use = env.useSupabase ?? env.NEXT_PUBLIC_USE_SUPABASE;
  const url = env.supabaseUrl ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.supabaseAnonKey ??
    env.supabasePublishableKey ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (use === "true" && Boolean(url) && Boolean(key)) {
    return "LIVE";
  }
  return "DEMO";
}

export function getDataMode(): DataMode {
  return resolveDataMode({
    NEXT_PUBLIC_USE_SUPABASE: process.env.NEXT_PUBLIC_USE_SUPABASE,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function isLiveMode(): boolean {
  return getDataMode() === "LIVE";
}

export function isDemoMode(): boolean {
  return getDataMode() === "DEMO";
}

/**
 * Erro de carga em modo LIVE.
 * Nunca deve ser convertido em demo-data.
 */
export class DatabaseLoadError extends Error {
  readonly dataMode = "LIVE" as const;
  readonly causeMessage: string | undefined;

  constructor(userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = "DatabaseLoadError";
    this.causeMessage = sanitizeErrorMessage(cause);
  }
}

/** Remove tokens/URLs sensíveis de mensagens exibidas na UI. */
export function sanitizeErrorMessage(cause: unknown): string | undefined {
  if (cause == null) return undefined;
  const raw =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : String(cause);

  return raw
    .replace(
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[redacted-jwt]",
    )
    .replace(/sb_publishable_[A-Za-z0-9_]+/gi, "[redacted-key]")
    .replace(/service_role[^\s]*/gi, "[redacted]")
    .replace(/https?:\/\/[^\s]*supabase[^\s]*/gi, "[supabase-url]")
    .slice(0, 280);
}
