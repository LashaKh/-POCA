import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import {
  Inter,
  Noto_Sans_Georgian,
  Noto_Serif,
  Noto_Serif_Georgian,
} from "next/font/google";

import "./globals.css";
import "./storefront-polish.css";

import { defaultLocale, isAppLocale } from "@/i18n/routing";

const utilityFont = Inter({
  display: "swap",
  subsets: ["latin", "cyrillic"],
  variable: "--font-utility-loaded",
});

const georgianUtilityFont = Noto_Sans_Georgian({
  display: "swap",
  subsets: ["georgian", "latin"],
  variable: "--font-georgian-utility-loaded",
});

const latinCyrillicDisplayFont = Noto_Serif({
  display: "swap",
  subsets: ["latin", "cyrillic"],
  variable: "--font-latin-cyrillic-display-loaded",
});

const displayFont = Noto_Serif_Georgian({
  display: "swap",
  subsets: ["georgian", "latin"],
  variable: "--font-display-loaded",
});

export const metadata: Metadata = {
  title: {
    default: "ÉPOCA",
    template: "%s — ÉPOCA",
  },
  description: "ÉPOCA online carpet collection.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get("x-next-intl-locale");
  const locale = isAppLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return (
    <html lang={locale}>
      <body
        className={`${utilityFont.variable} ${georgianUtilityFont.variable} ${latinCyrillicDisplayFont.variable} ${displayFont.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
