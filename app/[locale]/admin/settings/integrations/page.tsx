import { getTranslations } from "next-intl/server";

import { IntegrationStatus } from "@/components/admin/settings/integration-status";
import { getIntegrationStatuses } from "@/features/settings/integration-status";
import { isAppLocale } from "@/i18n/routing";

export default async function IntegrationSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "admin.security" }),
    getIntegrationStatuses(locale),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("integrationsTitle")}</h1>
        <p>{t("integrationsIntro")}</p>
      </header>
      <IntegrationStatus integrations={data.integrations} />
      <section className="admin-panel">
        <h2>{t("businessSettings")}</h2>
        <p>
          Values are intentionally omitted here. This inventory shows only
          whether a setting is sensitive and when it changed.
        </p>
        <ul className="plain-list">
          {data.settings.map((setting) => (
            <li key={setting.key}>
              <strong>{setting.key}</strong> ·{" "}
              {setting.sensitive ? "sensitive" : "operational"} · version{" "}
              {setting.version}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
