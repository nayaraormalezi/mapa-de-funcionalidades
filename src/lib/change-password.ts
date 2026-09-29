/**
 * Validação pura da alteração de senha (Conta → Segurança).
 * Política alinhada ao restante do PRISMA (mín. 8 caracteres).
 */

export const MIN_PASSWORD_LENGTH = 8;

export type ChangePasswordFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordValidation =
  | { ok: true }
  | {
      ok: false;
      message: string;
      /** Campo principal associado ao erro (acessibilidade / UI). */
      field?: "currentPassword" | "newPassword" | "confirmPassword";
    };

/**
 * Valida campos antes de chamar o Supabase Auth.
 * Senhas são valores brutos — sem trim().
 */
export function validateChangePasswordInput(
  input: ChangePasswordFields,
): ChangePasswordValidation {
  const { currentPassword, newPassword, confirmPassword } = input;

  if (!currentPassword) {
    return {
      ok: false,
      message: "Informe a senha atual.",
      field: "currentPassword",
    };
  }

  if (!newPassword) {
    return {
      ok: false,
      message: "Informe a nova senha.",
      field: "newPassword",
    };
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: "A nova senha não atende aos requisitos de segurança.",
      field: "newPassword",
    };
  }

  if (!confirmPassword) {
    return {
      ok: false,
      message: "Confirme a nova senha.",
      field: "confirmPassword",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      message: "As senhas não coincidem.",
      field: "confirmPassword",
    };
  }

  if (newPassword === currentPassword) {
    return {
      ok: false,
      message: "Escolha uma senha diferente da senha atual.",
      field: "newPassword",
    };
  }

  return { ok: true };
}

export const CHANGE_PASSWORD_SUCCESS = "Senha alterada com sucesso.";
export const CHANGE_PASSWORD_UNAUTHENTICATED =
  "Sua sessão expirou. Entre novamente para alterar a senha.";
export const CHANGE_PASSWORD_GENERIC_ERROR =
  "Não foi possível alterar sua senha. Tente novamente.";
