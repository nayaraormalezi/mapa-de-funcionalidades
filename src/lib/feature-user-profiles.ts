/**
 * Perfil de usuário associado à Feature (≠ Público, ≠ responsável da task).
 */

export const FEATURE_USER_PROFILE_NAME_MAX = 120;

export type FeatureUserProfileKind = "REGISTERED_USER" | "MANUAL_PROFILE";

/** Chave estável para filtro/dedupe (não é o texto exibido). */
export function normalizeManualProfileKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function displayFeatureUserProfileKind(
  kind: FeatureUserProfileKind,
): string {
  return kind === "REGISTERED_USER" ? "Usuário cadastrado" : "Perfil manual";
}

export function filterKeyForRegisteredUser(userId: string): string {
  return `user:${userId}`;
}

export function filterKeyForManualProfile(name: string): string {
  return `manual:${normalizeManualProfileKey(name)}`;
}

export type AddFeatureUserProfileInput =
  | { kind: "REGISTERED_USER"; userId: string; profileName?: never }
  | { kind: "MANUAL_PROFILE"; profileName: string; userId?: never };

export type ValidateFeatureUserProfileResult =
  | { ok: true; kind: FeatureUserProfileKind; userId: string | null; profileName: string | null }
  | { ok: false; message: string };

export function validateFeatureUserProfileInput(input: {
  kind?: string;
  userId?: string | null;
  profileName?: string | null;
}): ValidateFeatureUserProfileResult {
  const kindRaw = String(input.kind ?? "").trim().toUpperCase();
  const userId = String(input.userId ?? "").trim() || null;
  // Sem trim forçado no sentido de "alterar senha" — nomes manuais: trim só nas bordas
  // para validação/armazenamento, mantendo o texto interno.
  const profileNameRaw = input.profileName == null ? "" : String(input.profileName);
  const profileName = profileNameRaw.trim() || null;

  if (kindRaw === "REGISTERED_USER" || (!kindRaw && userId && !profileName)) {
    if (!userId) {
      return { ok: false, message: "Selecione um usuário cadastrado." };
    }
    if (profileName) {
      return {
        ok: false,
        message: "Usuário cadastrado não deve informar nome manual.",
      };
    }
    return {
      ok: true,
      kind: "REGISTERED_USER",
      userId,
      profileName: null,
    };
  }

  if (kindRaw === "MANUAL_PROFILE" || (!kindRaw && profileName && !userId)) {
    if (!profileName) {
      return { ok: false, message: "Informe o nome do perfil." };
    }
    if (userId) {
      return {
        ok: false,
        message: "Perfil manual não deve informar usuário cadastrado.",
      };
    }
    if (profileName.length > FEATURE_USER_PROFILE_NAME_MAX) {
      return {
        ok: false,
        message: `O nome do perfil deve ter no máximo ${FEATURE_USER_PROFILE_NAME_MAX} caracteres.`,
      };
    }
    return {
      ok: true,
      kind: "MANUAL_PROFILE",
      userId: null,
      profileName,
    };
  }

  return {
    ok: false,
    message: "Informe um usuário cadastrado ou um perfil manual.",
  };
}

export function isDuplicateManualProfile(
  existingNames: string[],
  candidateName: string,
): boolean {
  const key = normalizeManualProfileKey(candidateName);
  return existingNames.some((n) => normalizeManualProfileKey(n) === key);
}

export function buildUserProfileFilterOptions(
  profiles: Array<{
    kind: FeatureUserProfileKind;
    userId: string | null;
    profileName: string | null;
    displayName: string;
  }>,
): { value: string; label: string }[] {
  const byKey = new Map<string, string>();
  for (const p of profiles) {
    if (p.kind === "REGISTERED_USER" && p.userId) {
      byKey.set(filterKeyForRegisteredUser(p.userId), p.displayName);
    } else if (p.profileName) {
      byKey.set(filterKeyForManualProfile(p.profileName), p.displayName);
    }
  }
  return Array.from(byKey.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function profileFilterKeysForFeature(
  profiles: Array<{
    kind: FeatureUserProfileKind;
    userId: string | null;
    profileName: string | null;
    displayName: string;
  }>,
): { keys: string[]; labels: string[] } {
  const keys: string[] = [];
  const labels: string[] = [];
  for (const p of profiles) {
    if (p.kind === "REGISTERED_USER" && p.userId) {
      keys.push(filterKeyForRegisteredUser(p.userId));
      labels.push(p.displayName);
    } else if (p.profileName) {
      keys.push(filterKeyForManualProfile(p.profileName));
      labels.push(p.displayName);
    }
  }
  return { keys, labels };
}
