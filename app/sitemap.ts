import type { MetadataRoute } from "next";

import { getCanonicalOrigin } from "@/features/catalog/metadata";
import { locales } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getCanonicalOrigin();
  const client = await createServerSupabaseClient();
  const service = createServiceSupabaseClient();
  const translations: Array<{
    locale: string;
    slug: string;
    updated_at: string;
  }> = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 50_000; offset += pageSize) {
    const { data, error } = await client
      .from("product_translations")
      .select("locale,slug,updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    translations.push(...data);
    if (data.length < pageSize) break;
  }

  const contentResult = await service
    .from("published_content_projection")
    .select("content_type,locale,slug,published_at")
    .order("published_at", { ascending: false });
  if (contentResult.error) throw contentResult.error;
  const homes = locales.map((locale) => ({
    url: `${origin}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: locale === "ka" ? 1 : 0.9,
  }));
  return [
    ...homes,
    ...translations.map((translation) => ({
      url: `${origin}/${translation.locale}/products/${translation.slug}`,
      lastModified: new Date(translation.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...contentResult.data
      .filter((content) => content.content_type !== "homepage")
      .map((content) => ({
        url: `${origin}/${content.locale}/${content.content_type === "journal" ? `journal/${content.slug}` : content.content_type}`,
        lastModified: content.published_at
          ? new Date(content.published_at)
          : new Date(),
        changeFrequency:
          content.content_type === "journal"
            ? ("monthly" as const)
            : ("weekly" as const),
        priority: content.content_type === "journal" ? 0.6 : 0.5,
      })),
  ];
}
