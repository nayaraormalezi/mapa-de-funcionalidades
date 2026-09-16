import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import type { GlobalSearchItem } from "@/components/layout/global-search";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getAuthState } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { getChannels, getJourneys } from "@/services/channels";
import { getFeatures } from "@/services/features";
import { getGaps } from "@/services/gaps";
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
  const [auth, gaps, features, journeys, channels] = await Promise.all([
    getAuthState(),
    getGaps(),
    getFeatures(),
    getJourneys(),
    getChannels(),
  ]);
  const gapsBadgeCount = gaps.filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  ).length;

  const searchItems: GlobalSearchItem[] = [
    ...features.map((feature) => ({
      id: feature.id,
      type: "feature" as const,
      label: feature.name,
      subtitle: feature.product || undefined,
      href: `/funcionalidades/${feature.id}`,
    })),
    ...journeys.map((journey) => ({
      id: journey.id,
      type: "journey" as const,
      label: journey.name,
      subtitle: journey.description || undefined,
      href: `/jornadas?journey=${encodeURIComponent(journey.id)}`,
    })),
    ...channels.map((channel) => ({
      id: channel.id,
      type: "channel" as const,
      label: channel.name,
      subtitle: channel.type || undefined,
      href: `/canais?channel=${encodeURIComponent(channel.id)}`,
    })),
  ];

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
          <AppShell gapsBadgeCount={gapsBadgeCount} searchItems={searchItems}>
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
