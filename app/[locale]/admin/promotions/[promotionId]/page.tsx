import { getTranslations } from "next-intl/server";

import { PromotionEditor } from "@/components/admin/commerce/promotion-editor";
import { getPromotion } from "@/features/promotions/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; promotionId: string }>;
}) {
  const { locale, promotionId } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, promotion] = await Promise.all([
    getTranslations({ locale, namespace: "admin.worldwide" }),
    getPromotion(promotionId),
  ]);
  return (
    <main className="admin-main" id="main-content">
      <header className="admin-page-header">
        <Link href="/admin/promotions" locale={locale}>
          {t("labels.back")}
        </Link>
        <p className="eyebrow">{promotion.code}</p>
        <h1>{t("promotionDetailTitle")}</h1>
      </header>
      <PromotionEditor
        locale={locale}
        promotion={promotion}
        labels={t.raw("labels")}
      />
    </main>
  );
}
