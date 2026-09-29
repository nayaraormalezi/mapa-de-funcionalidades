import { NextResponse } from "next/server";
import { safeAuthCallbackNext } from "@/lib/auth-callback-path";
import { logAuthError } from "@/lib/auth-messages";
import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeAuthCallbackNext(url.searchParams.get("next"));

  if (!isSupabaseEnabled()) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    logAuthError("callback", {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
    });
  }

  return NextResponse.redirect(
    new URL("/login?error=reset_link", url.origin),
  );
}
