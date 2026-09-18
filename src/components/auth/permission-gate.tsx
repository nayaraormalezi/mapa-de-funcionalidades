"use client";

import { useAuth } from "@/components/auth/auth-provider";
import type { ReactNode } from "react";

/**
 * Gate de UI para ações operacionais (Editor + Admin).
 * Mutations continuam protegidas no servidor via guardMutation.
 */
export function CanEdit({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canEdit } = useAuth();
  if (!canEdit) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * Gate de UI para ações administrativas (Admin).
 * Não usar para esconder ações que Editor pode executar.
 */
export function CanAdmin({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canAdmin } = useAuth();
  if (!canAdmin) return <>{fallback}</>;
  return <>{children}</>;
}
