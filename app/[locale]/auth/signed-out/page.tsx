import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function SignedOutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <main className="system-state" id="main-content">
      <h1>{t("signedOutTitle")}</h1>
      <p>{t("signedOutBody")}</p>
      <Link className="button-link" href="/" locale={locale}>
        {t("returnToCollection")}
      </Link>
    </main>
  );
}
