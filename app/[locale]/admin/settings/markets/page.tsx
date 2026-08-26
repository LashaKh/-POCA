import { getTranslations } from "next-intl/server";

import { MarketEditor } from "@/components/admin/commerce/market-editor";
import { getMarketAdministration } from "@/features/delivery/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function MarketSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, markets] = await Promise.all([
    getTranslations({ locale, namespace: "admin.worldwide" }),
    getMarketAdministration(),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("marketsTitle")}</h1>
        <p>{t("marketsIntro")}</p>
      </header>
      <MarketEditor
        locale={locale}
        markets={markets}
        labels={t.raw("labels")}
      />
    </main>
  );
}
