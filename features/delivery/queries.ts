import "server-only";

import type { SupportedCurrency } from "@/i18n/preferences";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function getDeliveryAdministration() {
  const client = await createServerSupabaseClient();
  const [zones, countries, methods, rates] = await Promise.all([
    client
      .from("shipping_zones")
      .select("*")
      .order("priority", { ascending: false }),
    client.from("shipping_zone_countries").select("*"),
    client.from("shipping_methods").select("*").order("code"),
    client
      .from("shipping_rate_rules")
      .select("*")
      .order("priority", { ascending: false }),
  ]);
  for (const result of [zones, countries, methods, rates]) {
    if (result.error) throw result.error;
  }
  return {
    zones: zones.data ?? [],
    countries: countries.data ?? [],
    methods: methods.data ?? [],
    rates: rates.data ?? [],
  };
}

export async function getMarketAdministration() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("market_settings")
    .select("*")
    .order("country_code");
  if (result.error) throw result.error;
  return result.data;
}

export async function getPublishedDeliveryOptions(currency: SupportedCurrency) {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_delivery_options")
    .select("*")
    .eq("currency", currency)
    .order("zone_priority", { ascending: false })
    .order("rate_priority", { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}
