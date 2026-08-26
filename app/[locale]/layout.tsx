import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SkipLink } from "@/components/ui";
import { routing, type AppLocale } from "@/i18n/routing";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <LocalizedFrame locale={locale}>{children}</LocalizedFrame>
    </NextIntlClientProvider>
  );
}

async function LocalizedFrame({
  children,
  locale,
}: {
  children: ReactNode;
  locale: AppLocale;
}) {
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return (
    <>
      <SkipLink>{messages.common.skipToContent}</SkipLink>
      <noscript>
        <div className="javascript-limited" role="status">
          <strong>{messages.systemStates.javascriptTitle}</strong>{" "}
          <span>{messages.systemStates.javascriptBody}</span>
        </div>
      </noscript>
      {children}
    </>
  );
}
