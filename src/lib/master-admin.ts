import { CORPORATE_EMAIL_DOMAIN } from "@/lib/corporate-email";

/** Conta com privilégio máximo de administração no PRISMA. */
export const MASTER_ADMIN_EMAIL = `nayara.melo@${CORPORATE_EMAIL_DOMAIN}`;

export function isMasterAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}
