import { ServiceContentPage } from "@/components/content/service-content-page";
import { isAppLocale } from "@/i18n/routing";
import { buildServiceContentMetadata } from "@/features/seo/content-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return isAppLocale(locale)
    ? buildServiceContentMetadata(locale, "cookie")
    : {};
}

export default async function CookiePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return isAppLocale(locale) ? (
    <ServiceContentPage contentKey="cookie" locale={locale} />
  ) : null;
}
