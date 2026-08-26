import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function expireDueCommerceWork(limit = 100) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("expire_due_checkout_work", {
    p_limit: limit,
  });
  if (error) throw error;
  return { affected: data };
}

export async function publishDueCatalogWork(limit = 100) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("process_due_catalog_publications", {
    p_limit: limit,
  });
  if (error) throw error;
  return data;
}
