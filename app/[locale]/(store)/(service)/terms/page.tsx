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
    ? buildServiceContentMetadata(locale, "terms")
    : {};
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return isAppLocale(locale) ? (
    <ServiceContentPage contentKey="terms" locale={locale} />
  ) : null;
}
