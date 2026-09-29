/**
 * Resolve o destino pós-callback Auth de forma segura (anti open-redirect).
 *
 * - next explícito e seguro → respeitado (signup `/`, reset `/auth/reset-password`, convite `/login`)
 * - ausente ou inseguro → `/` (não assume reset de senha)
 */
export function safeAuthCallbackNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}
