import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function LocalizedNotFound() {
  const t = await getTranslations("systemStates");
  return (
    <main className="system-state" id="main-content">
      <p className="eyebrow">404 · ÉPOCA</p>
      <h1>{t("notFoundTitle")}</h1>
      <p>{t("notFoundBody")}</p>
      <Link className="button" href="/">
        {t("home")}
      </Link>
    </main>
  );
}
