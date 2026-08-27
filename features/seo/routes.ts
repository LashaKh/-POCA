import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";

export type PublishedLocalizedRoute = {
  locale: AppLocale;
  slug?: string;
};

export type LocalizedRouteSet = {
  requestedLocale: AppLocale;
  resolvedLocale: AppLocale;
  canonicalUrl: string;
  alternates: Partial<Record<AppLocale, string>>;
  xDefault: string;
  indexable: boolean;
};

function cleanPath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] ?? "/";
  if (path === "/") return path;
  return `/${path.split("/").filter(Boolean).join("/")}`;
}

export function absoluteStorefrontUrl(origin: string, pathname: string) {
  return new URL(cleanPath(pathname), `${new URL(origin).origin}/`).toString();
}

export function buildLocalizedRouteSet({
  origin,
  requestedLocale,
  resolvedLocale,
  routes,
  pathFor,
  allowIndex = true,
}: {
  origin: string;
  requestedLocale: AppLocale;
  resolvedLocale: AppLocale;
  routes: readonly PublishedLocalizedRoute[];
  pathFor: (route: PublishedLocalizedRoute) => string;
  allowIndex?: boolean;
}): LocalizedRouteSet {
  const uniqueRoutes = new Map<AppLocale, PublishedLocalizedRoute>();
  for (const route of routes) {
    if (!isAppLocale(route.locale) || uniqueRoutes.has(route.locale)) continue;
    uniqueRoutes.set(route.locale, route);
  }

  const resolved =
    uniqueRoutes.get(resolvedLocale) ??
    uniqueRoutes.get(requestedLocale) ??
    uniqueRoutes.get(defaultLocale) ??
    uniqueRoutes.get("en") ??
    [...uniqueRoutes.values()][0];
  if (!resolved) {
    throw new Error("A localized route set requires a published route.");
  }

  const alternates = Object.fromEntries(
    [...uniqueRoutes.values()].map((route) => [
      route.locale,
      absoluteStorefrontUrl(origin, pathFor(route)),
    ]),
  ) as Partial<Record<AppLocale, string>>;
  const xDefault =
    alternates[defaultLocale] ??
    alternates.en ??
    alternates[resolved.locale] ??
    absoluteStorefrontUrl(origin, pathFor(resolved));

  return {
    requestedLocale,
    resolvedLocale: resolved.locale,
    canonicalUrl: absoluteStorefrontUrl(origin, pathFor(resolved)),
    alternates,
    xDefault,
    indexable: allowIndex && requestedLocale === resolved.locale,
  };
}

export function buildStaticLocalizedRouteSet({
  origin,
  locale,
  pathname,
  allowIndex = true,
}: {
  origin: string;
  locale: AppLocale;
  pathname: string;
  allowIndex?: boolean;
}) {
  const suffix = cleanPath(pathname);
  return buildLocalizedRouteSet({
    origin,
    requestedLocale: locale,
    resolvedLocale: locale,
    routes: (["ka", "en", "de", "ru"] as const).map((routeLocale) => ({
      locale: routeLocale,
    })),
    pathFor: (route) => `/${route.locale}${suffix === "/" ? "" : suffix}`,
    allowIndex,
  });
}

export function routeSetLanguages(routeSet: LocalizedRouteSet) {
  return { ...routeSet.alternates, "x-default": routeSet.xDefault };
}
