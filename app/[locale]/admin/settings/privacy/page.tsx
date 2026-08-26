import { getTranslations } from "next-intl/server";

import { PrivacyWorkspace } from "@/components/admin/settings/privacy-workspace";
import { requireOwnerPage } from "@/features/auth/admin-guard";
import { isAppLocale } from "@/i18n/routing";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [{ client }, t] = await Promise.all([
    requireOwnerPage(locale, "/admin/settings/privacy"),
    getTranslations({ locale, namespace: "admin.security" }),
  ]);
  const [profiles, requests] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name,profile_kind")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("privacy_requests")
      .select(
        "id,request_type,status,subject_profile_id,created_at,safe_result_code",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (profiles.error) throw profiles.error;
  if (requests.error) throw requests.error;
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("privacyTitle")}</h1>
        <p>{t("privacyIntro")}</p>
      </header>
      <PrivacyWorkspace
        locale={locale}
        profiles={profiles.data}
        requests={requests.data}
      />
    </main>
  );
}
