/**
 * Asserts FeatureUserProfile (cadastrado × manual).
 * Executar: npx --yes tsx src/lib/feature-user-profiles.assert.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { roleCan } from "./permissions";
import {
  buildUserProfileFilterOptions,
  filterKeyForManualProfile,
  filterKeyForRegisteredUser,
  isDuplicateManualProfile,
  normalizeManualProfileKey,
  validateFeatureUserProfileInput,
} from "./feature-user-profiles";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const root = resolve(process.cwd());
const actionSrc = readFileSync(
  resolve(root, "src/app/actions/feature-user-profiles.ts"),
  "utf8",
);
const migrationSrc = readFileSync(
  resolve(
    root,
    "supabase/migrations/20260929100000_feature_user_profiles.sql",
  ),
  "utf8",
);
const sheetSrc = readFileSync(
  resolve(root, "src/components/feature/feature-sheet.tsx"),
  "utf8",
);
const panelSrc = readFileSync(
  resolve(root, "src/components/feature/feature-user-profiles-panel.tsx"),
  "utf8",
);
const mapaSrc = readFileSync(
  resolve(root, "src/app/mapa/mapa-client.tsx"),
  "utf8",
);

// A/B validação de entrada
const registered = validateFeatureUserProfileInput({
  kind: "REGISTERED_USER",
  userId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
});
assert(registered.ok && registered.kind === "REGISTERED_USER", "A registered");
assert(registered.ok && registered.userId !== null, "N guarda user_id");
assert(registered.ok && registered.profileName === null, "N sem nome manual");

const manual = validateFeatureUserProfileInput({
  kind: "MANUAL_PROFILE",
  profileName: "Cliente contemplado",
});
assert(manual.ok && manual.kind === "MANUAL_PROFILE", "B manual");
assert(manual.ok && manual.userId === null, "O manual sem user_id");
assert(
  manual.ok && manual.profileName === "Cliente contemplado",
  "B guarda nome",
);

// C sem user_id nem profile_name
const empty = validateFeatureUserProfileInput({});
assert(!empty.ok, "C vazio inválido");

const emptyKind = validateFeatureUserProfileInput({
  kind: "REGISTERED_USER",
  userId: "",
});
assert(!emptyKind.ok, "C registered sem user");

// D existência: action verifica profiles no backend
assert(actionSrc.includes('.from("profiles")'), "D verifica usuário no DB");
assert(
  actionSrc.includes("Usuário cadastrado não encontrado"),
  "D mensagem usuário inexistente",
);

// E/F duplicação
assert(
  isDuplicateManualProfile(
    ["Cliente contemplado"],
    "  cliente   contemplado ",
  ),
  "F dedupe normalizado",
);
assert(
  !isDuplicateManualProfile(["Cliente contemplado"], "Cliente com cota"),
  "F nomes distintos",
);
assert(
  normalizeManualProfileKey("  Cliente   Contemplado ") ===
    "cliente contemplado",
  "normalização key",
);
assert(
  migrationSrc.includes("feature_user_profiles_feature_user_uidx"),
  "E unique user",
);
assert(
  migrationSrc.includes("feature_user_profiles_feature_name_uidx"),
  "F unique manual",
);

// G remoção
assert(actionSrc.includes("removeFeatureUserProfile"), "G remove action");
assert(panelSrc.includes("Remover perfil"), "G UI remove");

// H/I/J permissões
assert(!roleCan("viewer", "feature.edit"), "H viewer não edita");
assert(roleCan("admin", "feature.edit"), "I admin edita");
assert(roleCan("editor", "feature.edit"), "J editor edita");
assert(
  actionSrc.includes("requireCanEdit"),
  "P backend exige canEdit",
);
assert(
  migrationSrc.includes("role in ('admin', 'editor')"),
  "P RLS editor/admin",
);

// K ficha
assert(sheetSrc.includes("FeatureUserProfilesPanel"), "K ficha");
assert(panelSrc.includes("Perfil de usuário"), "K título");

// L preview = mesma fonte (painel reutilizável / compact)
assert(panelSrc.includes("compact"), "L painel compacto disponível");

// M filtro
assert(mapaSrc.includes("Perfil de usuário"), "M filtro mapa");
assert(
  filterKeyForRegisteredUser("u1") === "user:u1",
  "M key registered",
);
assert(
  filterKeyForManualProfile("Cliente Contemplado") ===
    "manual:cliente contemplado",
  "M key manual",
);
const opts = buildUserProfileFilterOptions([
  {
    kind: "REGISTERED_USER",
    userId: "u1",
    profileName: null,
    displayName: "Nayara",
  },
  {
    kind: "MANUAL_PROFILE",
    userId: null,
    profileName: "Cliente contemplado",
    displayName: "Cliente contemplado",
  },
]);
assert(opts.length === 2, "M options");

// O não cria Auth
assert(!actionSrc.includes("auth.admin"), "O sem Admin Auth");
assert(!actionSrc.includes("signUp"), "O sem signUp");
assert(
  migrationSrc.includes("references public.profiles"),
  "O user_id → profiles",
);

// Auditoria via trigger
assert(migrationSrc.includes("log_audit"), "auditoria trigger");

// XOR constraint
assert(migrationSrc.includes("feature_user_profiles_xor"), "xor constraint");

console.log("feature-user-profiles.assert: ok");
