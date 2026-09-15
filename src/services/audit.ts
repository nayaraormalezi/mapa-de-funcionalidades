import { createClient, isSupabaseEnabled } from "@/lib/supabase/server";
import type { AuditLogEntry } from "@/types";

type AuditRow = {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

function mapRow(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    actorRole: row.actor_role,
    beforeData: row.before_data,
    afterData: row.after_data,
    createdAt: row.created_at,
  };
}

export async function listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  if (!isSupabaseEnabled()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("audit_logs fetch failed:", error.message);
    return [];
  }

  return ((data ?? []) as AuditRow[]).map(mapRow);
}
