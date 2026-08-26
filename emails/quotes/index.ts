import type { AppLocale } from "@/i18n/routing";

import { renderGermanQuoteEmail } from "./de";
import { renderEnglishQuoteEmail } from "./en";
import { renderGeorgianQuoteEmail } from "./ka";
import { renderRussianQuoteEmail } from "./ru";
import type { QuoteNotificationInput } from "./types";

const renderers = {
  de: renderGermanQuoteEmail,
  en: renderEnglishQuoteEmail,
  ka: renderGeorgianQuoteEmail,
  ru: renderRussianQuoteEmail,
};

export function renderQuoteNotification(
  locale: AppLocale,
  input: QuoteNotificationInput,
) {
  return renderers[locale](input);
}
