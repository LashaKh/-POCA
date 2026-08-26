import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { catalogListResultSchema, catalogListSchema } from "./admin-schema";

const PAGE_SIZE = 25;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function getAdminCatalogProducts(raw: unknown) {
  const filters = catalogListSchema.parse(raw);
  const client = await createServerSupabaseClient();
  const result = await client.rpc("list_staff_catalog_products", {
    p_query: filters.query,
    p_status: filters.status,
    p_translation: filters.translation,
    p_stock: filters.stock,
    p_sort: filters.sort,
    p_page: filters.page,
    p_page_size: PAGE_SIZE,
  });
  if (result.error) throw result.error;
  const data = catalogListResultSchema.parse(result.data);
  return {
    rows: data.rows,
    count: data.count,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(data.count / PAGE_SIZE)),
    filters,
  };
}

export async function getAdminProductDetail(productId: string) {
  const client = await createServerSupabaseClient();
  const [product, translations, prices, inventory, media, revisions] =
    await Promise.all([
      client.from("products").select("*").eq("id", productId).maybeSingle(),
      client
        .from("product_translations")
        .select("*")
        .eq("product_id", productId)
        .order("locale"),
      client
        .from("product_prices")
        .select("*")
        .eq("product_id", productId)
        .order("currency"),
      client
        .from("inventory_items")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle(),
      client
        .from("media_links")
        .select("*,media_assets(*,media_variants(*))")
        .eq("entity_type", "product")
        .eq("entity_id", productId)
        .order("position"),
      client
        .from("catalog_revisions")
        .select(
          "id,entity_version,revision_kind,changed_fields,note,actor_profile_id,created_at,snapshot",
        )
        .eq("entity_type", "product")
        .eq("entity_id", productId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  for (const result of [
    product,
    translations,
    prices,
    inventory,
    media,
    revisions,
  ]) {
    if (result.error) throw result.error;
  }
  if (!product.data) return undefined;
  const productRow = product.data;
  return {
    product: productRow,
    translations: translations.data ?? [],
    prices: prices.data ?? [],
    inventory: inventory.data,
    media: media.data ?? [],
    previewImages: (media.data ?? []).flatMap((link) => {
      const asset = link.media_assets;
      if (!asset) return [];
      return asset.media_variants
        .filter(
          (variant) =>
            variant.status === "approved" && variant.role === "gallery_3x4",
        )
        .map((variant) => ({
          id: variant.id,
          alt: link.alt_text ?? productRow.sku,
          src: client.storage
            .from("product-renditions")
            .getPublicUrl(variant.path).data.publicUrl,
        }));
    }),
    revisions: revisions.data ?? [],
  };
}

export async function getCatalogCollections() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("collections")
    .select("*,collection_translations(*),collection_products(count)")
    .order("updated_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}

export async function getCatalogCollection(collectionId: string) {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("collections")
    .select(
      "*,collection_translations(*),collection_products(*,products(id,sku,status,product_translations(locale,name)))",
    )
    .eq("id", collectionId)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function getCatalogImports() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("catalog_import_batches")
    .select(
      "*,catalog_import_rows(row_number,status,validation_errors,safe_error_code)",
    )
    .order("created_at", { ascending: false })
    .limit(25);
  if (result.error) throw result.error;
  return result.data;
}

export async function getCatalogExports() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("export_jobs")
    .select(
      "id,status,row_count,download_name,object_path,safe_error_code,created_at,expires_at",
    )
    .eq("export_type", "catalog")
    .order("created_at", { ascending: false })
    .limit(20);
  if (result.error) throw result.error;
  return result.data;
}

export async function getCatalogSavedViews() {
  const client = await createServerSupabaseClient();
  const result = await client
    .from("saved_admin_views")
    .select("id,name,filters,sort,updated_at")
    .eq("view_type", "products")
    .order("name");
  if (result.error) throw result.error;
  return result.data.flatMap((view) => {
    const sort = isRecord(view.sort) ? view.sort.value : undefined;
    const parsed = catalogListSchema.safeParse({
      ...(isRecord(view.filters) ? view.filters : {}),
      sort,
      page: 1,
    });
    return parsed.success ? [{ ...view, filters: parsed.data }] : [];
  });
}
