import { getTranslations } from "next-intl/server";

import { isAppLocale } from "@/i18n/routing";

export default async function VerifyAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <main className="system-state" id="main-content">
      <h1>{t("verifyTitle")}</h1>
      <p role="status">{t("signUpGeneric")}</p>
    </main>
  );
}
