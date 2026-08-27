import type { MetadataRoute } from "next";

import { getCanonicalOrigin } from "@/features/catalog/metadata";
import {
  assertSitemapCapacity,
  localizedSitemapAlternates,
  sitemapReadinessLimit,
  type LocalizedSitemapRow,
} from "@/features/seo/sitemap";
import { isAppLocale, locales } from "@/i18n/routing";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export { sitemapReadinessLimit };

const databasePageSize = 1_000;

type ProductRouteRow = {
  product_id: string | null;
  locale: string | null;
  slug: string | null;
  updated_at: string | null;
  primary_image_path: string | null;
};

type CollectionRouteRow = {
  collection_id: string | null;
  locale: string | null;
  slug: string | null;
  updated_at: string | null;
};

type ContentRouteRow = {
  entry_key: string | null;
  content_type: string | null;
  legal_status: string | null;
  locale: string | null;
  slug: string | null;
  published_at: string | null;
  social_image_url: string | null;
};

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += databasePageSize) {
    const result = await fetchPage(from, from + databasePageSize - 1);
    if (result.error) throw result.error;
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < databasePageSize) return rows;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getCanonicalOrigin();
  const service = createServiceSupabaseClient();
  const [productRows, collectionRows, contentRows] = await Promise.all([
    fetchAllPages<ProductRouteRow>((from, to) =>
      service
        .from("published_product_routes")
        .select("product_id,locale,slug,updated_at,primary_image_path")
        .order("product_id")
        .order("locale")
        .range(from, to),
    ),
    fetchAllPages<CollectionRouteRow>((from, to) =>
      service
        .from("published_collection_routes")
        .select("collection_id,locale,slug,updated_at")
        .order("collection_id")
        .order("locale")
        .range(from, to),
    ),
    fetchAllPages<ContentRouteRow>((from, to) =>
      service
        .from("published_content_projection")
        .select(
          "entry_key,content_type,legal_status,locale,slug,published_at,social_image_url",
        )
        .order("entry_key")
        .order("locale")
        .range(from, to),
    ),
  ]);

  const imagesByProduct = new Map<string, string[]>();
  for (const row of productRows) {
    if (
      !row.product_id ||
      !row.primary_image_path ||
      imagesByProduct.has(row.product_id)
    )
      continue;
    imagesByProduct.set(row.product_id, [
      service.storage
        .from("product-renditions")
        .getPublicUrl(row.primary_image_path).data.publicUrl,
    ]);
  }

  const productRoutes = productRows.flatMap((row) =>
    row.product_id && isAppLocale(row.locale) && row.slug && row.updated_at
      ? [
          {
            product_id: row.product_id,
            locale: row.locale,
            slug: row.slug,
            updated_at: row.updated_at,
          },
        ]
      : [],
  );
  const collectionRoutes = collectionRows.flatMap((row) =>
    row.collection_id && isAppLocale(row.locale) && row.slug && row.updated_at
      ? [
          {
            collection_id: row.collection_id,
            locale: row.locale,
            slug: row.slug,
            updated_at: row.updated_at,
          },
        ]
      : [],
  );
  const contentRoutes = contentRows.flatMap((row) =>
    row.entry_key && row.content_type && isAppLocale(row.locale) && row.slug
      ? [
          {
            entry_key: row.entry_key,
            content_type: row.content_type,
            legal_status: row.legal_status,
            locale: row.locale,
            slug: row.slug,
            published_at: row.published_at,
            social_image_url: row.social_image_url,
          },
        ]
      : [],
  );

  const productGroups = Map.groupBy(productRoutes, (row) => row.product_id);
  const collectionGroups = Map.groupBy(
    collectionRoutes,
    (row) => row.collection_id,
  );
  const contentGroups = Map.groupBy(contentRoutes, (row) => row.entry_key);
  const staticAlternates = Object.fromEntries(
    locales.map((locale) => [locale, `${origin}/${locale}`]),
  );
  const staticPathAlternates = (pathname: string) => ({
    ...Object.fromEntries(
      locales.map((locale) => [locale, `${origin}/${locale}${pathname}`]),
    ),
    "x-default": `${origin}/ka${pathname}`,
  });
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push(
      {
        url: `${origin}/${locale}`,
        changeFrequency: "daily",
        priority: locale === "ka" ? 1 : 0.9,
        alternates: {
          languages: {
            ...staticAlternates,
            "x-default": `${origin}/ka`,
          },
        },
      },
      {
        url: `${origin}/${locale}/collections`,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: staticPathAlternates("/collections"),
        },
      },
      {
        url: `${origin}/${locale}/journal`,
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: staticPathAlternates("/journal"),
        },
      },
    );
  }

  for (const [productId, rows] of productGroups) {
    const alternates = localizedSitemapAlternates(
      origin,
      rows as LocalizedSitemapRow[],
      (row) => `/${row.locale}/products/${row.slug}`,
    );
    for (const row of rows) {
      entries.push({
        url: `${origin}/${row.locale}/products/${row.slug}`,
        lastModified: new Date(row.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages: alternates },
        images: imagesByProduct.get(productId),
      });
    }
  }

  for (const rows of collectionGroups.values()) {
    const alternates = localizedSitemapAlternates(
      origin,
      rows as LocalizedSitemapRow[],
      (row) => `/${row.locale}/collections/${row.slug}`,
    );
    for (const row of rows) {
      entries.push({
        url: `${origin}/${row.locale}/collections/${row.slug}`,
        lastModified: new Date(row.updated_at),
        changeFrequency: "weekly",
        priority: 0.75,
        alternates: { languages: alternates },
      });
    }
  }

  const safeStaticServices = ["about", "faq", "contact"] as const;
  for (const locale of locales) {
    for (const servicePath of safeStaticServices) {
      entries.push({
        url: `${origin}/${locale}/${servicePath}`,
        changeFrequency: "monthly",
        priority: 0.5,
        alternates: {
          languages: staticPathAlternates(`/${servicePath}`),
        },
      });
    }
  }

  for (const rows of contentGroups.values()) {
    const first = rows[0];
    if (!first || first.content_type === "homepage") continue;
    if (first.legal_status === "draft_unapproved") continue;
    const journal = first.content_type === "journal";
    const alternates = localizedSitemapAlternates(origin, rows, (row) =>
      journal
        ? `/${row.locale}/journal/${row.slug}`
        : `/${row.locale}/${first.content_type}`,
    );
    for (const row of rows) {
      const url = journal
        ? `${origin}/${row.locale}/journal/${row.slug}`
        : `${origin}/${row.locale}/${first.content_type}`;
      if (entries.some((entry) => entry.url === url)) continue;
      entries.push({
        url,
        lastModified: row.published_at ? new Date(row.published_at) : undefined,
        changeFrequency: "monthly",
        priority: journal ? 0.65 : 0.5,
        alternates: { languages: alternates },
        images: row.social_image_url ? [row.social_image_url] : undefined,
      });
    }
  }

  return assertSitemapCapacity(entries);
}
