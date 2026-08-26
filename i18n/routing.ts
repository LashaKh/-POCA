import { defineRouting } from "next-intl/routing";

export const locales = ["ka", "en", "de", "ru"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "ka";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});

export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" && locales.some((locale) => locale === value)
  );
}

export function parseLocalizedPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const locale = isAppLocale(segments[0]) ? segments[0] : defaultLocale;
  const contentSegments = isAppLocale(segments[0])
    ? segments.slice(1)
    : segments;

  return {
    locale,
    segment: contentSegments[0],
    pathname: `/${contentSegments.join("/")}`,
  };
}
