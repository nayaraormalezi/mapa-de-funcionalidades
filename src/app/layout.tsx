import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getAuthState } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import "./globals.css";

/** Authenticated Supabase reads require request cookies. */
export const dynamic = "force-dynamic";

const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Mapa de Funcionalidades · CAIXA Consórcio",
  description:
    "Ferramenta interna de governança UX + CX + Produto para inventário vivo de necessidades e funcionalidades.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthState();

  return (
    <html lang="pt-BR" className={`${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider
          value={{
            userId: auth.userId,
            email: auth.email,
            profile: auth.profile,
            role: auth.role,
            canEdit: auth.canEdit,
            isAdmin: auth.isAdmin,
            supabaseEnabled: isSupabaseEnabled(),
          }}
        >
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
