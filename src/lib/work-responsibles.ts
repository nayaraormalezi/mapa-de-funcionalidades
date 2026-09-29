/**
 * Responsável pela execução / acompanhamento da unidade de trabalho
 * (FeatureChannelContext ou FeatureEvolution).
 *
 * Distinto de Público (Cliente / Economiário / Parceiro).
 */

export const WORK_RESPONSIBLE_NAME_MAX = 120;

export type WorkResponsibleKind = "REGISTERED_USER" | "MANUAL";

export type WorkResponsibleOwner =
  | { kind: "FCC"; featureChannelContextId: string }
  | { kind: "EVOLUTION"; featureEvolutionId: string };

export function normalizeManualResponsibleKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function displayWorkResponsibleKind(kind: WorkResponsibleKind): string {
  return kind === "REGISTERED_USER"
    ? "Usuário cadastrado"
    : "Nome manual";
}

export type AddWorkResponsibleInput =
  | { kind: "REGISTERED_USER"; userId: string; responsibleName?: never }
  | { kind: "MANUAL"; responsibleName: string; userId?: never };

export type ValidateWorkResponsibleResult =
  | {
      ok: true;
      kind: WorkResponsibleKind;
      userId: string | null;
      responsibleName: string | null;
    }
  | { ok: false; message: string };

export function validateWorkResponsibleInput(input: {
  kind?: string;
  userId?: string | null;
  responsibleName?: string | null;
}): ValidateWorkResponsibleResult {
  const kindRaw = String(input.kind ?? "").trim().toUpperCase();
  const userId = String(input.userId ?? "").trim() || null;
  const nameRaw =
    input.responsibleName == null ? "" : String(input.responsibleName);
  const responsibleName = nameRaw.trim() || null;

  if (
    kindRaw === "REGISTERED_USER" ||
    (!kindRaw && userId && !responsibleName)
  ) {
    if (!userId) {
      return { ok: false, message: "Selecione um usuário cadastrado." };
    }
    if (responsibleName) {
      return {
        ok: false,
        message: "Usuário cadastrado não deve informar nome manual.",
      };
    }
    return {
      ok: true,
      kind: "REGISTERED_USER",
      userId,
      responsibleName: null,
    };
  }

  if (
    kindRaw === "MANUAL" ||
    kindRaw === "MANUAL_PROFILE" ||
    (!kindRaw && responsibleName && !userId)
  ) {
    if (!responsibleName) {
      return { ok: false, message: "Informe o nome do responsável." };
    }
    if (userId) {
      return {
        ok: false,
        message: "Responsável manual não deve informar usuário cadastrado.",
      };
    }
    if (responsibleName.length > WORK_RESPONSIBLE_NAME_MAX) {
      return {
        ok: false,
        message: `O nome do responsável deve ter no máximo ${WORK_RESPONSIBLE_NAME_MAX} caracteres.`,
      };
    }
    return {
      ok: true,
      kind: "MANUAL",
      userId: null,
      responsibleName,
    };
  }

  return {
    ok: false,
    message: "Informe um usuário cadastrado ou um responsável manual.",
  };
}

export function isDuplicateManualResponsible(
  existingNames: string[],
  candidateName: string,
): boolean {
  const key = normalizeManualResponsibleKey(candidateName);
  return existingNames.some((n) => normalizeManualResponsibleKey(n) === key);
}

/** Texto denormalizado para FCC.responsible / Evolution.responsible (filtros/legado). */
export function joinResponsibleDisplayNames(names: string[]): string {
  return names
    .map((n) => n.trim())
    .filter(Boolean)
    .join(", ");
}
