import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function getCurrencyAdministration() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("currency_settings")
    .select("*")
    .order("display_order");
  if (result.error) throw result.error;
  return result.data;
}

export async function getPublishedCurrencies() {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_currency_settings")
    .select("*")
    .order("display_order");
  if (result.error) throw result.error;
  return result.data;
}

export async function getPriceMatrix(search = "") {
  const client = await createServerSupabaseClient();
  let productsQuery = client
    .from("staff_catalog_products")
    .select("id,sku,display_name")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (search.trim()) {
    productsQuery = productsQuery.or(
      `sku.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`,
    );
  }
  const products = await productsQuery;
  if (products.error) throw products.error;
  const normalizedProducts = products.data.filter(
    (product): product is typeof product & { id: string } =>
      product.id !== null,
  );
  const ids = normalizedProducts.map((product) => product.id);
  const prices = ids.length
    ? await client
        .from("product_prices")
        .select("*")
        .in("product_id", ids)
        .order("currency")
    : { data: [], error: null };
  if (prices.error) throw prices.error;
  return { products: normalizedProducts, prices: prices.data };
}
