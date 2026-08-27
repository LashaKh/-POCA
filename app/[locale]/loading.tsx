import { getTranslations } from "next-intl/server";

export default async function LocalizedLoading() {
  const t = await getTranslations("systemStates");
  return (
    <div className="system-state" aria-busy="true">
      <p className="eyebrow">ÉPOCA</p>
      <p className="system-state-title">{t("loadingTitle")}</p>
      <p role="status" aria-live="polite">
        {t("loadingBody")}
      </p>
      <div className="system-state-progress" aria-hidden="true" />
    </div>
  );
}
