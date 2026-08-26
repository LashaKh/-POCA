import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function inspectContactCleanup() {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("contact_submissions")
    .select("id", { count: "exact", head: true })
    .in("status", ["closed", "spam"])
    .lte("retention_due_at", new Date().toISOString());
  if (result.error) throw result.error;
  return { overdue: result.count ?? 0 };
}
