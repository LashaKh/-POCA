import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPromotions() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("discounts")
    .select("*")
    .order("priority", { ascending: false })
    .order("starts_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}

export async function getPromotion(id: string) {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("discounts")
    .select("*")
    .eq("id", id)
    .single();
  if (result.error) throw result.error;
  return result.data;
}
