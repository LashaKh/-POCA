import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/features/auth/admin-guard";
import { isAppLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const { client, context } = await requireAdminPage();
  const sessions = await client
    .from("app_sessions")
    .select(
      "auth_session_id,device_label,assurance_level,last_seen_at,revoked_at",
    )
    .eq("profile_id", context.profileId)
    .order("last_seen_at", { ascending: false })
    .limit(8);
  if (sessions.error) throw sessions.error;

  return (
    <AdminShell locale={locale} context={context} sessions={sessions.data}>
      {children}
    </AdminShell>
  );
}
