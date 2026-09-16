import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import type { GlobalSearchItem } from "@/components/layout/global-search";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getAuthState } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { buildFeatureMapRows, getChannels, getJourneys } from "@/services/channels";
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
  title: "PRISMA · UX + CX · CAIXA Consórcio",
  description:
    "Ambiente interno de UX + CX do Consórcio CAIXA — visão integrada de funcionalidades, jornadas, canais e experiências.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [auth, gaps, features, journeys, channels, mapRows] = await Promise.all([
    getAuthState(),
    getGaps(),
    getFeatures(),
    getJourneys(),
    getChannels(),
    buildFeatureMapRows(),
  ]);
  const gapsBadgeCount = gaps.filter(
    (g) => g.status === "OPEN" || g.status === "IN_PROGRESS",
  ).length;

  const productsByFeature = new Map<string, string[]>();
  for (const row of mapRows) {
    const list = productsByFeature.get(row.featureId) ?? [];
    if (!list.includes(row.productShortName)) list.push(row.productShortName);
    productsByFeature.set(row.featureId, list);
  }

  const searchItems: GlobalSearchItem[] = [
    ...features.map((feature) => ({
      id: feature.id,
      type: "feature" as const,
      label: feature.name,
      subtitle:
        productsByFeature.get(feature.id)?.join(" · ") ||
        feature.product ||
        undefined,
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
