import { ServiceContentPage } from "@/components/content/service-content-page";
import { isAppLocale } from "@/i18n/routing";
import { buildServiceContentMetadata } from "@/features/seo/content-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return isAppLocale(locale) ? buildServiceContentMetadata(locale, "faq") : {};
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return isAppLocale(locale) ? (
    <ServiceContentPage contentKey="faq" locale={locale} />
  ) : null;
}
