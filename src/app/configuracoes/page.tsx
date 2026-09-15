import { getAuthState } from "@/lib/auth";
import { ConfiguracoesClient } from "./configuracoes-client";

const TABS = [
  "overview",
  "users",
  "cadastros",
  "integracoes",
  "preferencias",
  "dados",
  "auditoria",
] as const;

type Tab = (typeof TABS)[number];

function isTab(value: string | undefined): value is Tab {
  return !!value && (TABS as readonly string[]).includes(value);
}

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await getAuthState();
  const { tab } = await searchParams;
  const displayName = auth.profile?.fullName?.trim() || auth.email || "Usuário";
  const email = auth.email ?? "—";

  return (
    <ConfiguracoesClient
      displayName={displayName}
      email={email}
      role={auth.role}
      canEdit={auth.canEdit}
      initialTab={isTab(tab) ? tab : "overview"}
    />
  );
}
