/** Domínio corporativo permitido para autenticação no PRISMA. */
export const CORPORATE_EMAIL_DOMAIN = "caixaconsorcio.com.br";

export const CORPORATE_EMAIL_ERROR =
  "Use um e-mail corporativo @caixaconsorcio.com.br.";

export function isCorporateEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  return domain === CORPORATE_EMAIL_DOMAIN;
}

export function validateCorporateEmail(
  email: string,
): { ok: true; email: string } | { ok: false; message: string } {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return { ok: false, message: "Informe um e-mail corporativo válido." };
  }
  if (!isCorporateEmail(normalized)) {
    return { ok: false, message: CORPORATE_EMAIL_ERROR };
  }
  return { ok: true, email: normalized };
}
