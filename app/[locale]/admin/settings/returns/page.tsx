import { getTranslations } from "next-intl/server";

import { ReturnPolicyEditor } from "@/components/admin/returns/return-policy-editor";
import { getActiveReturnPolicy } from "@/features/returns/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function ReturnSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, policy] = await Promise.all([
    getTranslations({ locale, namespace: "admin.returns" }),
    getActiveReturnPolicy(),
  ]);
  return (
    <main className="admin-main" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("policy")}</p>
        <h1>{t("settingsTitle")}</h1>
        <p>{t("settingsIntro")}</p>
      </header>
      <ReturnPolicyEditor
        locale={locale}
        policy={policy}
        labels={t.raw("policyEditor")}
      />
    </main>
  );
}
