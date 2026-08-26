import type { AppLocale } from "@/i18n/routing";

import { renderOrderNotification } from "../order/notifications";

export function renderOrderStaffAlert(
  locale: AppLocale,
  orderReference: string,
) {
  return renderOrderNotification(locale, {
    templateKey: "order-staff-alert",
    orderReference,
  });
}
