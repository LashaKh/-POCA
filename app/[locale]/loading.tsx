import { getTranslations } from "next-intl/server";

export default async function LocalizedLoading() {
  const t = await getTranslations("systemStates");
  return (
    <main className="system-state" id="main-content" aria-busy="true">
      <p className="eyebrow">ÉPOCA</p>
      <h1>{t("loadingTitle")}</h1>
      <p role="status">{t("loadingBody")}</p>
      <div className="system-state-progress" aria-hidden="true" />
    </main>
  );
}
