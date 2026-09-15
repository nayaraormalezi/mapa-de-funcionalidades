"use client";

import { createContext, useContext } from "react";
import type { UserProfile, UserRole } from "@/types";

export type AuthContextValue = {
  userId: string | null;
  email: string | null;
  profile: UserProfile | null;
  role: UserRole;
  canEdit: boolean;
  isAdmin: boolean;
  supabaseEnabled: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  email: null,
  profile: null,
  role: "viewer",
  canEdit: false,
  isAdmin: false,
  supabaseEnabled: false,
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
