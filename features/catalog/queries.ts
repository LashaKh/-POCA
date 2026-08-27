import "server-only";

import { cache } from "react";

import type { CatalogSearchParams } from "./search-params";
import { mapCatalogProduct, type CatalogProduct } from "./types";

import { getCanonicalOrigin } from "@/features/catalog/metadata";
import { buildLocalizedRouteSet } from "@/features/seo/routes";
import type { SupportedCurrency } from "@/i18n/preferences";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CatalogListResult = {
  products: CatalogProduct[];
  totalCount: number;
};

export type CatalogFacet = {
  key: "material" | "color";
  value: string;
  count: number;
};

function mapSearchRow(row: {
  id: string;
  sku: string;
  slug: string;
  name: string;
  short_description: string | null;
  content_locale: AppLocale;
  requested_locale: AppLocale;
  amount_minor: unknown;
  currency: unknown;
  available_quantity: number;
  width_mm: number | null;
  length_mm: number | null;
  materials: string[];
  colors: string[];
  primary_image_path: string | null;
}) {
  return mapCatalogProduct({
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description ?? undefined,
    contentLocale: row.content_locale,
    requestedLocale: row.requested_locale,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    availableQuantity: row.available_quantity,
    widthMm: row.width_mm ?? undefined,
    lengthMm: row.length_mm ?? undefined,
    materials: row.materials,
    colors: row.colors,
    primaryImagePath: row.primary_image_path ?? undefined,
  });
}

export async function searchCatalog({
  locale,
  currency,
  params,
  limit = 24,
}: {
  locale: AppLocale;
  currency: SupportedCurrency;
  params: CatalogSearchParams;
  limit?: number;
}): Promise<CatalogListResult> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("search_catalog", {
    p_locale: locale,
    p_query: params.query,
    p_currency: currency,
    p_collection_slug: params.collection,
    p_limit: limit,
    p_offset: (params.page - 1) * limit,
    p_materials: params.material,
    p_colors: params.color,
    p_in_stock: params.availability === "in-stock",
    p_sort: params.sort,
  });

  if (error) throw error;
  const products = data.map((row) =>
    mapSearchRow({
      ...row,
      primary_image_path: row.primary_image_path
        ? client.storage
            .from("product-renditions")
            .getPublicUrl(row.primary_image_path).data.publicUrl
        : null,
    }),
  );

  return { products, totalCount: data[0]?.total_count ?? 0 };
}

export async function getCatalogFacets({
  locale,
  currency,
  collection,
}: {
  locale: AppLocale;
  currency: SupportedCurrency;
  collection?: string;
}): Promise<CatalogFacet[]> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("catalog_facets", {
    p_locale: locale,
    p_currency: currency,
    p_collection_slug: collection,
  });
  if (error) throw error;

  return data.flatMap((facet) =>
    facet.filter_key === "material" || facet.filter_key === "color"
      ? [
          {
            key: facet.filter_key,
            value: facet.value,
            count: Number(facet.product_count),
          },
        ]
      : [],
  );
}

export async function getHomeCatalog(
  locale: AppLocale,
  currency: SupportedCurrency,
) {
  return searchCatalog({
    locale,
    currency,
    limit: 8,
    params: {
      query: "",
      page: 1,
      sort: "newest",
      currency,
      material: [],
      color: [],
      availability: "all",
    },
  });
}

export async function getCatalogProductsByIds({
  locale,
  currency,
  productIds,
}: {
  locale: AppLocale;
  currency: SupportedCurrency;
  productIds: string[];
}) {
  if (!productIds.length) return [];
  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("public_catalog_products")
    .select("*")
    .in("id", productIds)
    .eq("locale", locale)
    .eq("currency", currency);
  if (error) throw error;
  const byId = new Map(
    data.flatMap((row) => {
      if (
        !row.id ||
        !row.sku ||
        !row.slug ||
        !row.name ||
        !row.locale ||
        row.amount_minor === null ||
        row.available_quantity === null ||
        !row.materials ||
        !row.colors
      )
        return [];
      return [
        [
          row.id,
          mapSearchRow({
            id: row.id,
            sku: row.sku,
            slug: row.slug,
            name: row.name,
            short_description: row.short_description,
            content_locale: row.locale,
            requested_locale: locale,
            amount_minor: row.amount_minor,
            currency: row.currency,
            available_quantity: row.available_quantity,
            width_mm: row.width_mm,
            length_mm: row.length_mm,
            materials: row.materials,
            colors: row.colors,
            primary_image_path: row.primary_image_path
              ? client.storage
                  .from("product-renditions")
                  .getPublicUrl(row.primary_image_path).data.publicUrl
              : null,
          }),
        ] as const,
      ];
    }),
  );
  return productIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

const getCollectionCached = cache(async (locale: AppLocale, slug: string) => {
  const client = await createServerSupabaseClient();
  const { data: candidates, error } = await client
    .from("published_collection_routes")
    .select("*")
    .eq("slug", slug)
    .in("locale", [locale, "en", "ka"]);

  if (error) throw error;
  const publishedCandidates = (candidates ?? []).filter(
    (
      candidate,
    ): candidate is typeof candidate & {
      collection_id: string;
      locale: AppLocale;
      slug: string;
      name: string;
      product_count: number;
    } =>
      Boolean(
        candidate.collection_id &&
        isAppLocale(candidate.locale) &&
        candidate.slug &&
        candidate.name &&
        candidate.product_count !== null,
      ),
  );
  const selected =
    publishedCandidates.find((candidate) => candidate.locale === locale) ??
    publishedCandidates.find((candidate) => candidate.locale === "en") ??
    publishedCandidates.find((candidate) => candidate.locale === "ka");
  if (!selected) return undefined;
  const { data: routes, error: routeError } = await client
    .from("published_collection_routes")
    .select("locale,slug")
    .eq("collection_id", selected.collection_id);
  if (routeError) throw routeError;
  const publishedRoutes = (routes ?? []).flatMap((route) =>
    isAppLocale(route.locale) && route.slug
      ? [{ locale: route.locale, slug: route.slug }]
      : [],
  );
  return {
    ...selected,
    routeSet: buildLocalizedRouteSet({
      origin: getCanonicalOrigin(),
      requestedLocale: locale,
      resolvedLocale: selected.locale,
      routes: publishedRoutes,
      pathFor: (route) => `/${route.locale}/collections/${route.slug}`,
    }),
  };
});

export async function getCollection(locale: AppLocale, slug: string) {
  return getCollectionCached(locale, slug);
}

export async function getPublishedCollections(locale: AppLocale) {
  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("published_collection_routes")
    .select("*")
    .eq("locale", locale)
    .order("name");
  if (error) throw error;
  return (data ?? []).flatMap((collection) =>
    collection.collection_id &&
    isAppLocale(collection.locale) &&
    collection.slug &&
    collection.name &&
    collection.product_count !== null
      ? [
          {
            ...collection,
            collection_id: collection.collection_id,
            locale: collection.locale,
            slug: collection.slug,
            name: collection.name,
            product_count: collection.product_count,
          },
        ]
      : [],
  );
}

export async function getCatalogProduct({
  locale,
  currency,
  slug,
}: {
  locale: AppLocale;
  currency: SupportedCurrency;
  slug: string;
}) {
  return getCatalogProductCached(locale, currency, slug);
}

const getCatalogProductCached = cache(async function getCatalogProductRecord(
  locale: AppLocale,
  currency: SupportedCurrency,
  slug: string,
) {
  const client = await createServerSupabaseClient();
  const { data: candidates, error } = await client
    .from("public_catalog_products")
    .select("*")
    .eq("slug", slug)
    .eq("currency", currency);

  if (error) throw error;
  const publishedCandidates = (candidates ?? []).filter(
    (
      candidate,
    ): candidate is typeof candidate & {
      id: string;
      locale: AppLocale;
      slug: string;
    } =>
      Boolean(candidate.id && isAppLocale(candidate.locale) && candidate.slug),
  );
  const data =
    publishedCandidates.find((candidate) => candidate.locale === locale) ??
    publishedCandidates.find((candidate) => candidate.locale === "en") ??
    publishedCandidates.find((candidate) => candidate.locale === "ka");
  if (!data) return undefined;

  const { data: routes, error: routeError } = await client
    .from("published_product_routes")
    .select("locale,slug")
    .eq("product_id", data.id);
  if (routeError) throw routeError;
  const publishedRoutes = (routes ?? []).flatMap((route) =>
    isAppLocale(route.locale) && route.slug
      ? [{ locale: route.locale, slug: route.slug }]
      : [],
  );

  const product = mapCatalogProduct({
    id: data.id,
    sku: data.sku,
    slug: data.slug,
    name: data.name,
    shortDescription: data.short_description ?? undefined,
    contentLocale: data.locale,
    requestedLocale: locale,
    amountMinor: Number(data.amount_minor),
    currency: data.currency,
    availableQuantity: data.available_quantity,
    widthMm: data.width_mm ?? undefined,
    lengthMm: data.length_mm ?? undefined,
    materials: data.materials,
    colors: data.colors,
    origin: data.origin ?? undefined,
    originVerified: Boolean(data.origin),
    primaryImagePath: data.primary_image_path
      ? client.storage
          .from("product-renditions")
          .getPublicUrl(data.primary_image_path).data.publicUrl
      : undefined,
    seoTitle: data.seo_title ?? undefined,
    seoDescription: data.seo_description ?? undefined,
    condition: data.condition ?? undefined,
    structuredDataEligible: data.structured_data_eligible,
    brand: data.brand ?? undefined,
    gtin: data.gtin ?? undefined,
    mpn: data.mpn ?? undefined,
    identifierExists: data.identifier_exists,
    publishedAt: data.published_at ?? undefined,
    updatedAt: data.translation_updated_at ?? data.updated_at ?? undefined,
  });
  product.routeSet = buildLocalizedRouteSet({
    origin: getCanonicalOrigin(),
    requestedLocale: locale,
    resolvedLocale: data.locale,
    routes: publishedRoutes,
    pathFor: (route) => `/${route.locale}/products/${route.slug}`,
  });

  const { data: links, error: linksError } = await client
    .from("media_links")
    .select("id,asset_id,position,alt_text")
    .eq("entity_type", "product")
    .eq("entity_id", product.id)
    .eq("purpose", "gallery")
    .order("position");
  if (linksError) throw linksError;

  const assetIds = links.map((link) => link.asset_id);
  const variantsResult = assetIds.length
    ? await client
        .from("media_variants")
        .select("id,asset_id,path,width,height,status,role")
        .in("asset_id", assetIds)
        .eq("status", "approved")
        .eq("role", "gallery_3x4")
    : { data: [], error: null };
  if (variantsResult.error) throw variantsResult.error;

  const images = links.flatMap((link) =>
    variantsResult.data
      .filter((variant) => variant.asset_id === link.asset_id)
      .map((variant) => ({
        id: variant.id,
        alt: link.alt_text ?? product.name,
        path: client.storage
          .from("product-renditions")
          .getPublicUrl(variant.path).data.publicUrl,
        width: variant.width,
        height: variant.height,
      })),
  );

  const { data: relations, error: relationsError } = await client
    .from("product_relations")
    .select("target_product_id,position")
    .eq("source_product_id", product.id)
    .order("position")
    .limit(8);
  if (relationsError) throw relationsError;

  const relatedIds = relations.map((relation) => relation.target_product_id);
  const relatedResult = relatedIds.length
    ? await client
        .from("public_catalog_products")
        .select("*")
        .in("id", relatedIds)
        .eq("locale", locale)
        .eq("currency", currency)
    : { data: [], error: null };
  if (relatedResult.error) throw relatedResult.error;

  const relatedById = new Map(
    relatedResult.data.map((row) => [
      row.id,
      mapCatalogProduct({
        id: row.id,
        sku: row.sku,
        slug: row.slug,
        name: row.name,
        shortDescription: row.short_description ?? undefined,
        contentLocale: row.locale,
        requestedLocale: locale,
        amountMinor: Number(row.amount_minor),
        currency: row.currency,
        availableQuantity: row.available_quantity,
        widthMm: row.width_mm ?? undefined,
        lengthMm: row.length_mm ?? undefined,
        materials: row.materials,
        colors: row.colors,
        primaryImagePath: row.primary_image_path
          ? client.storage
              .from("product-renditions")
              .getPublicUrl(row.primary_image_path).data.publicUrl
          : undefined,
      }),
    ]),
  );
  const relatedProducts = relatedIds.flatMap((id) => {
    const related = relatedById.get(id);
    return related ? [related] : [];
  });

  return {
    product,
    details: {
      longDescription: data.long_description,
      careText: data.care_text,
      construction: data.construction,
      condition: data.condition,
      deliveryClass: data.delivery_class,
      ageMinYear: data.age_min_year,
      ageMaxYear: data.age_max_year,
      pile: data.pile,
      handmade: data.handmade,
      provenanceSummary: data.provenance_summary,
    },
    images,
    relatedProducts,
  };
});
