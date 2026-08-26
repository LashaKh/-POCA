import type { AppLocale } from "@/i18n/routing";

import { renderGermanReturnEmail } from "./de";
import { renderEnglishReturnEmail } from "./en";
import { renderGeorgianReturnEmail } from "./ka";
import { renderRussianReturnEmail } from "./ru";
import type { ReturnNotificationInput } from "./types";

const renderers = {
  de: renderGermanReturnEmail,
  en: renderEnglishReturnEmail,
  ka: renderGeorgianReturnEmail,
  ru: renderRussianReturnEmail,
};

export function renderReturnNotification(
  locale: AppLocale,
  input: ReturnNotificationInput,
) {
  return renderers[locale](input);
}
