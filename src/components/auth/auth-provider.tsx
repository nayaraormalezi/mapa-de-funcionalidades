"use client";

import { createContext, useContext } from "react";
import type { UserProfile, UserRole } from "@/types";

export type AuthContextValue = {
  userId: string | null;
  email: string | null;
  profile: UserProfile | null;
  role: UserRole;
  /** Editor ou Admin — ações operacionais. */
  canEdit: boolean;
  /** Somente Admin — taxonomias / usuários. */
  canAdmin: boolean;
  /** Alias de canAdmin (legado). */
  isAdmin: boolean;
  isMasterAdmin: boolean;
  /** @deprecated Prefer dataMode === "LIVE" */
  supabaseEnabled: boolean;
  /** LIVE = Supabase real; DEMO = demo-data explícito */
  dataMode: "LIVE" | "DEMO";
};

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  email: null,
  profile: null,
  role: "viewer",
  canEdit: false,
  canAdmin: false,
  isAdmin: false,
  isMasterAdmin: false,
  supabaseEnabled: false,
  dataMode: "DEMO",
});

export function AuthProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
