import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { AccountNavigation } from "@/components/customer/account-navigation";
import { SiteShell } from "@/components/storefront/site-shell";
import { requireCustomerPage } from "@/features/customer/context";
import { isAppLocale } from "@/i18n/routing";

export const metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AccountLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  await requireCustomerPage(locale);
  const t = await getTranslations({ locale, namespace: "account" });
  return (
    <SiteShell locale={locale}>
      <div className="account-frame">
        <AccountNavigation
          locale={locale}
          labels={{
            overview: t("nav.overview"),
            orders: t("nav.orders"),
            addresses: t("nav.addresses"),
            wishlist: t("nav.wishlist"),
            settings: t("nav.settings"),
          }}
        />
        {children}
      </div>
    </SiteShell>
  );
}
