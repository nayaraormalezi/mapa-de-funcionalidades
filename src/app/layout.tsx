import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/layout/app-shell";
import type { GlobalSearchItem } from "@/components/layout/global-search";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getAuthState } from "@/lib/auth";
import { getDataMode } from "@/lib/data-mode";
import { isSupabaseEnabled } from "@/lib/supabase/server";
import { buildFeatureMapRows, getChannels, getJourneys, getProducts } from "@/services/channels";
import { getFeatures } from "@/services/features";
import { getIssues } from "@/services/gaps";
import { getHubSignals, hubBadgeCount } from "@/services/gaps-opportunities";
import "./globals.css";

/** Authenticated Supabase reads require request cookies. */
export const dynamic = "force-dynamic";

/** Tipografia institucional CAIXA Std — substitui IBM Plex Sans. */
const caixaStd = localFont({
  src: [
    { path: "./fonts/CAIXAStd-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/CAIXAStd-LightItalic.ttf", weight: "300", style: "italic" },
    { path: "./fonts/CAIXAStd-Book.ttf", weight: "350", style: "normal" },
    { path: "./fonts/CAIXAStd-BookItalic.ttf", weight: "350", style: "italic" },
    { path: "./fonts/CAIXAStd-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/CAIXAStd-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/CAIXAStd-SemiBold.ttf", weight: "600", style: "normal" },
    {
      path: "./fonts/CAIXAStd-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    { path: "./fonts/CAIXAStd-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/CAIXAStd-BoldItalic.ttf", weight: "700", style: "italic" },
    { path: "./fonts/CAIXAStd-ExtraBold.ttf", weight: "800", style: "normal" },
    {
      path: "./fonts/CAIXAStd-ExtraBoldItalic.ttf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-body",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
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
  const dataMode = getDataMode();
  const [auth, features, journeys, channels, products, issues, mapRows, hub] =
    await Promise.all([
      getAuthState(),
      getFeatures(),
      getJourneys(),
      getChannels(),
      getProducts(),
      getIssues(),
      buildFeatureMapRows(),
      getHubSignals(),
    ]);
  // Badge = Gaps de cobertura + Oportunidades + Issues abertas (datasets distintos).
  const gapsBadgeCount = hubBadgeCount(hub);

  const productsByFeature = new Map<string, string[]>();
  for (const row of mapRows) {
    const list = productsByFeature.get(row.featureId) ?? [];
    if (!list.includes(row.productShortName)) list.push(row.productShortName);
    productsByFeature.set(row.featureId, list);
  }

  const openIssues = issues.filter(
    (i) => i.status !== "RESOLVED" && i.status !== "WONT_FIX",
  );

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
    ...products.map((product) => ({
      id: product.id,
      type: "product" as const,
      label: product.shortName || product.name,
      subtitle: product.name !== product.shortName ? product.name : undefined,
      href: `/produtos?product=${encodeURIComponent(product.id)}`,
    })),
    ...openIssues.map((issue) => ({
      id: issue.id,
      type: "issue" as const,
      label: issue.title,
      subtitle: issue.type,
      href: `/gaps/${issue.id}`,
    })),
  ];

  return (
    <html lang="pt-BR" className={`${caixaStd.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AuthProvider
          value={{
            userId: auth.userId,
            email: auth.email,
            profile: auth.profile,
            role: auth.role,
            canEdit: auth.canEdit,
            canAdmin: auth.canAdmin,
            isAdmin: auth.isAdmin,
            isMasterAdmin: auth.isMasterAdmin,
            supabaseEnabled: isSupabaseEnabled(),
            dataMode,
          }}
        >
          <AppShell
            dataMode={dataMode}
            gapsBadgeCount={gapsBadgeCount}
            searchItems={searchItems}
          >
            {children}
          </AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
