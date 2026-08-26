import type { AppLocale } from "@/i18n/routing";

import { renderGermanOrderEmail } from "./de";
import { renderEnglishOrderEmail } from "./en";
import { renderGeorgianOrderEmail } from "./ka";
import { renderRussianOrderEmail } from "./ru";
import type { OrderEmailInput } from "./types";

const renderers = {
  de: renderGermanOrderEmail,
  en: renderEnglishOrderEmail,
  ka: renderGeorgianOrderEmail,
  ru: renderRussianOrderEmail,
};

export function renderOrderEmail(locale: AppLocale, input: OrderEmailInput) {
  return renderers[locale](input);
}
