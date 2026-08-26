import { getTranslations } from "next-intl/server";

import { isAppLocale } from "@/i18n/routing";

export default async function SessionEndedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <main className="system-state" id="main-content">
      <h1>{t("sessionEndedTitle")}</h1>
      <p>{t("sessionEndedBody")}</p>
    </main>
  );
}
