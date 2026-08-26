import { getTranslations } from "next-intl/server";

import { OrderHistory } from "@/components/customer/order-history";
import { getCustomerAccountOverview } from "@/features/customer/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function CustomerOrdersPage({
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
  return (
    <main className="account-page" id="main-content">
      <header className="account-header">
        <h1>{t("orders.title")}</h1>
        <p>{t("orders.body")}</p>
      </header>
      <OrderHistory
        locale={locale}
        orders={data.orders}
        labels={{
          empty: t("orders.empty"),
          status: t("orders.status"),
          items: t("orders.items"),
        }}
      />
    </main>
  );
}
