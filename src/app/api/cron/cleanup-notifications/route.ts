import { NextResponse } from "next/server";
import { cleanupExpiredNotifications } from "@/lib/notifications/service";

/**
 * Limpeza diária de notificações > 15 dias.
 * Protegido por CRON_SECRET (Authorization: Bearer …).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupExpiredNotifications();
  return NextResponse.json({ ok: true, deleted });
}
