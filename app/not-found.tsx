import NextLink from "next/link";
import { headers } from "next/headers";

import { defaultLocale, isAppLocale } from "@/i18n/routing";

export default async function GlobalNotFound() {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get("x-next-intl-locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  const copy = messages.systemStates;
  return (
    <main className="system-state" id="main-content">
      <p className="eyebrow">404 · ÉPOCA</p>
      <h1>{copy.notFoundTitle}</h1>
      <p>{copy.notFoundBody}</p>
      <NextLink className="button" href={`/${locale}`}>
        {copy.home}
      </NextLink>
    </main>
  );
}
