import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";

/**
 * Cadastros e taxonomias: acesso exclusivo de Admin,
 * via Configurações › Cadastros.
 */
export default async function CadastrosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthState();
  if (!auth.canAdmin) {
    redirect("/configuracoes");
  }
  return children;
}
