import { getTranslations } from "next-intl/server";

import { AddressBook } from "@/components/customer/address-book";
import { getCustomerAccountOverview } from "@/features/customer/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function CustomerAddressesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getCustomerAccountOverview(locale),
  ]);
  const keys = [
    "label",
    "fullName",
    "organization",
    "line1",
    "line2",
    "city",
    "region",
    "postalCode",
    "country",
    "phone",
    "instructions",
    "default",
    "save",
    "saved",
    "failed",
    "delete",
    "add",
  ] as const;
  return (
    <main className="account-page" id="main-content">
      <header className="account-header">
        <h1>{t("addresses.title")}</h1>
        <p>{t("addresses.body")}</p>
      </header>
      <AddressBook
        locale={locale}
        addresses={data.addresses}
        labels={Object.fromEntries(
          keys.map((key) => [key, t(`addresses.${key}`)]),
        )}
      />
    </main>
  );
}
