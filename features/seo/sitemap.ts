import type { AppLocale } from "@/i18n/routing";

export const sitemapReadinessLimit = 45_000;

export type LocalizedSitemapRow = {
  locale: AppLocale;
  slug: string;
};

export function localizedSitemapAlternates(
  origin: string,
  rows: readonly LocalizedSitemapRow[],
  pathFor: (row: LocalizedSitemapRow) => string,
) {
  const languages = Object.fromEntries(
    rows.map((row) => [row.locale, `${origin}${pathFor(row)}`]),
  );
  const defaultRow =
    rows.find((row) => row.locale === "ka") ??
    rows.find((row) => row.locale === "en") ??
    rows[0];

  return defaultRow
    ? { ...languages, "x-default": `${origin}${pathFor(defaultRow)}` }
    : languages;
}

export function assertSitemapCapacity<T>(entries: T[]) {
  if (entries.length >= sitemapReadinessLimit) {
    throw new Error(
      `SITEMAP_SHARDING_REQUIRED: ${entries.length} URLs reached the ${sitemapReadinessLimit} readiness limit.`,
    );
  }
  return entries;
}
