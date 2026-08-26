import { getTranslations } from "next-intl/server";

import { DeliveryEditor } from "@/components/admin/commerce/delivery-editor";
import { getDeliveryAdministration } from "@/features/delivery/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function DeliverySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "admin.worldwide" }),
    getDeliveryAdministration(),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("deliveryTitle")}</h1>
        <p>{t("deliveryIntro")}</p>
      </header>
      <DeliveryEditor locale={locale} data={data} labels={t.raw("labels")} />
    </main>
  );
}
