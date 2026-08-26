import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function runWorldwideSellingMaintenance(limit = 200) {
  const client = createServiceSupabaseClient();
  const result = await client.rpc("run_worldwide_selling_maintenance", {
    p_limit: limit,
  });
  if (result.error) throw result.error;
  return result.data;
}
