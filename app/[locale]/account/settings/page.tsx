import { getTranslations } from "next-intl/server";

import { CustomerSessionManager } from "@/components/customer/customer-session-manager";
import { PreferencesForm } from "@/components/customer/preferences-form";
import { PrivacyControls } from "@/components/customer/privacy-controls";
import { getCustomerAccountOverview } from "@/features/customer/queries";
import { isAppLocale } from "@/i18n/routing";

function labels<T extends string>(
  translate: (key: string) => string,
  prefix: string,
  keys: readonly T[],
) {
  return Object.fromEntries(
    keys.map((key) => [key, translate(`${prefix}.${key}`)]),
  ) as Record<T, string>;
}

export default async function CustomerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getCustomerAccountOverview(locale),
  ]);
  return (
    <main className="account-page" id="main-content">
      <header className="account-header">
        <h1>{t("settings.title")}</h1>
        <p>{t("settings.body")}</p>
      </header>
      <section className="account-panel">
        <h2>{t("settings.preferences")}</h2>
        <PreferencesForm
          locale={locale}
          profile={data.profile}
          labels={labels(t, "preferences", [
            "name",
            "currency",
            "marketing",
            "marketingGranted",
            "marketingDenied",
            "marketingWithdrawn",
            "save",
            "saved",
            "failed",
          ] as const)}
        />
      </section>
      <CustomerSessionManager
        locale={locale}
        sessions={data.sessions}
        labels={labels(t, "session", [
          "title",
          "browser",
          "revoke",
          "empty",
          "other",
          "all",
          "current",
        ] as const)}
      />
      <section className="account-panel">
        <h2>{t("privacy.title")}</h2>
        <PrivacyControls
          locale={locale}
          labels={labels(t, "privacy", [
            "requestType",
            "access",
            "export",
            "correction",
            "deletion",
            "reason",
            "retention",
            "submit",
            "requested",
            "failed",
          ] as const)}
        />
        {data.privacyRequests.length ? (
          <ul>
            {data.privacyRequests.map((request) => (
              <li key={request.id}>
                {request.request_type} · {request.status} ·{" "}
                <time dateTime={request.created_at}>
                  {new Date(request.created_at).toLocaleDateString(locale)}
                </time>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
