import { getTranslations } from "next-intl/server";

import { StaffManagement } from "@/components/admin/settings/staff-management";
import { requireOwnerPage } from "@/features/auth/admin-guard";
import { isAppLocale } from "@/i18n/routing";

export default async function StaffSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [{ client }, t] = await Promise.all([
    requireOwnerPage(locale, "/admin/settings/staff"),
    getTranslations({ locale, namespace: "admin.security" }),
  ]);
  const [staff, invitations] = await Promise.all([
    client
      .from("staff_members")
      .select(
        "profile_id,role,active,mfa_required,version,deactivated_at,profiles!staff_members_profile_id_fkey(display_name)",
      )
      .order("created_at"),
    client
      .from("staff_invitations")
      .select("id,email,role,status,expires_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  if (staff.error) throw staff.error;
  if (invitations.error) throw invitations.error;
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("staffTitle")}</h1>
        <p>{t("staffIntro")}</p>
      </header>
      <StaffManagement
        locale={locale}
        staff={staff.data}
        invitations={invitations.data}
      />
    </main>
  );
}
