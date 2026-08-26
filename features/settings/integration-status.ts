import "server-only";

import { requireOwnerPage } from "@/features/auth/admin-guard";
import type { AppLocale } from "@/i18n/routing";

export async function getIntegrationStatuses(locale: AppLocale) {
  const { client } = await requireOwnerPage(
    locale,
    "/admin/settings/integrations",
  );
  const [integrations, settings] = await Promise.all([
    client.from("integration_status_safe").select("*").order("key"),
    client
      .from("business_settings")
      .select("key,sensitive,updated_at,version")
      .order("key"),
  ]);
  if (integrations.error) throw integrations.error;
  if (settings.error) throw settings.error;
  return { integrations: integrations.data, settings: settings.data };
}
