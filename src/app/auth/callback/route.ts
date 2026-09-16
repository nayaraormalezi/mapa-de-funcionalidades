import { NextResponse } from "next/server";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/auth/reset-password";
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!isSupabaseEnabled()) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("[auth:callback]", error.message);
  }

  return NextResponse.redirect(
    new URL("/login?error=reset_link", url.origin),
  );
}
