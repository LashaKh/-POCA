import type { ReactNode } from "react";

import { SiteShell } from "@/components/storefront/site-shell";
import { isAppLocale } from "@/i18n/routing";

export default async function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;

  return <SiteShell locale={locale}>{children}</SiteShell>;
}
