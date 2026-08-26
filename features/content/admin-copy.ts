import "server-only";

import type { AppLocale } from "@/i18n/routing";

export async function getContentAdminLabels(locale: AppLocale) {
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return messages.admin.content as Record<string, string>;
}
