import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function runContentScheduleMaintenance(limit = 100) {
  const client = createServiceSupabaseClient();
  const result = await client.rpc("run_content_contact_consent_maintenance", {
    p_delete_limit: limit,
  });
  if (result.error) throw result.error;
  return result.data;
}
