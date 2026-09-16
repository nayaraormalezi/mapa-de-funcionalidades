import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar · PRISMA",
  description:
    "Acesse o PRISMA — ambiente interno de UX + CX do Consórcio CAIXA.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const nextPath = next && next.startsWith("/") ? next : "/";

  return (
    <LoginForm
      nextPath={nextPath}
      resetLinkError={error === "reset_link"}
    />
  );
}
