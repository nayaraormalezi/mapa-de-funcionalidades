/**
 * Asserts da alteração de senha (Configurações → Segurança).
 * Executar: npx --yes tsx src/lib/change-password.assert.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { friendlyAuthMessage, toAuthErrorLogPayload } from "./auth-messages";
import {
  CHANGE_PASSWORD_GENERIC_ERROR,
  CHANGE_PASSWORD_SUCCESS,
  CHANGE_PASSWORD_UNAUTHENTICATED,
  MIN_PASSWORD_LENGTH,
  validateChangePasswordInput,
} from "./change-password";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const root = resolve(process.cwd());

// A. Aba Segurança acessível a qualquer autenticado (não gated por admin)
const pageSrc = readFileSync(
  resolve(root, "src/app/configuracoes/page.tsx"),
  "utf8",
);
const clientSrc = readFileSync(
  resolve(root, "src/app/configuracoes/configuracoes-client.tsx"),
  "utf8",
);
assert(pageSrc.includes('"seguranca"'), "page inclui tab seguranca");
assert(
  clientSrc.includes('{ id: "seguranca", label: "Segurança" }'),
  "tab Segurança sempre listada",
);
assert(
  !clientSrc.includes('next === "seguranca" && !admin'),
  "Segurança não exige admin",
);
assert(
  clientSrc.includes("<ChangePasswordPanel"),
  "painel de alterar senha na aba Segurança",
);

// B. Campos obrigatórios
assert(
  validateChangePasswordInput({
    currentPassword: "",
    newPassword: "NovaSenha1",
    confirmPassword: "NovaSenha1",
  }).ok === false,
  "senha atual obrigatória",
);
assert(
  validateChangePasswordInput({
    currentPassword: "AtualSenha1",
    newPassword: "",
    confirmPassword: "x",
  }).ok === false,
  "nova senha obrigatória",
);
assert(
  validateChangePasswordInput({
    currentPassword: "AtualSenha1",
    newPassword: "NovaSenha1",
    confirmPassword: "",
  }).ok === false,
  "confirmação obrigatória",
);

// C. Confirmação diferente
const mismatch = validateChangePasswordInput({
  currentPassword: "AtualSenha1",
  newPassword: "NovaSenha1",
  confirmPassword: "OutraSenha1",
});
assert(!mismatch.ok && mismatch.message === "As senhas não coincidem.", "C");

// D. Nova senha igual à atual
const same = validateChangePasswordInput({
  currentPassword: "MesmaSenha1",
  newPassword: "MesmaSenha1",
  confirmPassword: "MesmaSenha1",
});
assert(
  !same.ok &&
    same.message === "Escolha uma senha diferente da senha atual.",
  "D",
);

// Política mínima (sem trim)
assert(MIN_PASSWORD_LENGTH === 8, "política mínima 8");
const short = validateChangePasswordInput({
  currentPassword: "AtualSenha1",
  newPassword: "curta",
  confirmPassword: "curta",
});
assert(
  !short.ok &&
    short.message === "A nova senha não atende aos requisitos de segurança.",
  "nova senha curta",
);
const withSpaces = validateChangePasswordInput({
  currentPassword: "AtualSenha1",
  newPassword: "  abcd  ",
  confirmPassword: "  abcd  ",
});
// 8 chars com espaços — válido na política de length; sem trim
assert(withSpaces.ok === true, "não faz trim na senha");

const valid = validateChangePasswordInput({
  currentPassword: "AtualSenha1",
  newPassword: "NovaSenha99",
  confirmPassword: "NovaSenha99",
});
assert(valid.ok, "payload válido passa");

// E. Senha atual incorreta (mapeamento Auth)
assert(
  friendlyAuthMessage("change-password", {
    message: "Invalid login credentials",
    code: "invalid_credentials",
    status: 400,
  }) === "A senha atual está incorreta.",
  "E senha atual incorreta",
);

// F. Contrato da action: usa getUser + signInWithPassword + updateUser (sem Admin)
const authActionSrc = readFileSync(
  resolve(root, "src/app/actions/auth.ts"),
  "utf8",
);
const changeStart = authActionSrc.indexOf("changePasswordAction");
const logoutStart = authActionSrc.indexOf(
  "export async function logoutAction",
  changeStart,
);
const changeFn = authActionSrc.slice(
  changeStart,
  logoutStart > changeStart ? logoutStart : undefined,
);
assert(
  authActionSrc.includes("export async function changePasswordAction"),
  "changePasswordAction existe",
);
assert(
  changeFn.includes("signInWithPassword"),
  "revalida senha atual com signInWithPassword",
);
assert(
  changeFn.includes("updateUser({ password: newPassword })"),
  "atualiza via updateUser",
);
assert(
  !changeFn.includes("createAdminClient") && !changeFn.includes("auth.admin"),
  "changePassword não usa Admin API",
);
assert(changeFn.includes("getUser()"), "F/G usa sessão getUser");
assert(
  !changeFn.includes('formData.get("user_id")') &&
    !changeFn.includes('formData.get("userId")'),
  "L não aceita userId do cliente",
);
assert(!changeFn.includes("signOut"), "G não faz logout após sucesso");
assert(!changeFn.includes("redirect("), "G/H não redireciona após sucesso");
assert(
  changeFn.includes("CHANGE_PASSWORD_SUCCESS") ||
    changeFn.includes("Senha alterada com sucesso"),
  "sucesso retorna mensagem",
);

// H. UI limpa campos após sucesso
const panelSrc = readFileSync(
  resolve(root, "src/app/configuracoes/change-password-panel.tsx"),
  "utf8",
);
assert(panelSrc.includes('setCurrentPassword("")'), "H limpa senha atual");
assert(panelSrc.includes('setNewPassword("")'), "H limpa nova senha");
assert(panelSrc.includes('setConfirmPassword("")'), "H limpa confirmação");
assert(
  panelSrc.includes("Senha alterada com sucesso") ||
    panelSrc.includes("result.message"),
  "H exibe feedback de sucesso",
);

// I. Logs sem senhas
const noisy = {
  message: "Invalid login credentials",
  code: "invalid_credentials",
  status: 400,
  name: "AuthApiError",
  password: "SuperSecret!",
  current_password: "OldSecret!",
  new_password: "NewSecret!",
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb",
};
const payload = toAuthErrorLogPayload(noisy);
const serialized = JSON.stringify(payload);
assert(!serialized.includes("Secret"), "I sem senhas no log");
assert(!serialized.includes("eyJ"), "I sem JWT no log");
assert(
  Object.keys(payload).sort().join(",") === "code,message,name,status",
  "I somente campos seguros",
);

// J. Não autenticado
assert(
  CHANGE_PASSWORD_UNAUTHENTICATED.includes("sessão"),
  "J mensagem sessão expirada",
);
assert(
  friendlyAuthMessage("change-password", {
    message: "JWT expired",
    status: 401,
  }) === CHANGE_PASSWORD_UNAUTHENTICATED,
  "J sessão expirada via Auth error",
);

// K. Roles: aba Segurança não depende de canAdmin/canEdit
assert(
  clientSrc.includes('id: "seguranca"') &&
    !/seguranca[\s\S]{0,80}admin/.test(
      clientSrc.slice(clientSrc.indexOf("tabOptions")),
    ),
  "K Segurança disponível para todos os roles",
);

// Mensagens canônicas
assert(
  CHANGE_PASSWORD_SUCCESS === "Senha alterada com sucesso.",
  "mensagem sucesso",
);
assert(
  CHANGE_PASSWORD_GENERIC_ERROR ===
    "Não foi possível alterar sua senha. Tente novamente.",
  "mensagem genérica",
);
assert(
  friendlyAuthMessage("change-password", {
    code: "weak_password",
    message: "Password should be at least 8 characters",
  }) === "A nova senha não atende aos requisitos de segurança.",
  "nova senha inválida",
);
assert(
  friendlyAuthMessage("change-password", {
    code: "same_password",
    message: "New password should be different from the old password.",
  }) === "Escolha uma senha diferente da senha atual.",
  "mesma senha via Auth",
);
assert(
  friendlyAuthMessage("change-password", {
    code: "over_request_rate_limit",
    status: 429,
    message: "rate limit",
  }).includes("Aguarde"),
  "rate limit change-password",
);
assert(
  friendlyAuthMessage("change-password", {
    code: "unexpected_failure",
    status: 500,
    message: "boom",
  }) === CHANGE_PASSWORD_GENERIC_ERROR,
  "erro inesperado",
);

console.log("change-password.assert: ok");
