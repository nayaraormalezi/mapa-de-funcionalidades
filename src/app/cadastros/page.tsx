import { redirect } from "next/navigation";

/** Hub antigo "Governança de dados" — cadastros vivem em Configurações. */
export default function CadastrosIndexPage() {
  redirect("/configuracoes?tab=cadastros");
}
