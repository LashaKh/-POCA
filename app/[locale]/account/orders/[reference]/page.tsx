import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { getCustomerOrder } from "@/features/customer/queries";
import { isAppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, returnsT, order] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getTranslations({ locale, namespace: "returns" }),
    getCustomerOrder(locale, reference),
  ]);
  if (!order) notFound();
  const currency = order.currency as "GEL" | "USD" | "EUR";
  const delivery = order.order_addresses.find(
    (address) => address.address_type === "delivery",
  );
  return (
    <main className="account-page" id="main-content">
      <Link href="/account/orders" locale={locale}>
        {t("orders.back")}
      </Link>
      <header className="account-header">
        <h1>{order.reference}</h1>
        <p>
          {t("orders.status")}: {order.status}
        </p>
      </header>
      <section className="account-panel">
        <h2>{t("orders.items")}</h2>
        <ul className="checkout-lines">
          {order.order_lines.map((line) => (
            <li key={line.id}>
              <span>
                {line.localized_name} × {line.quantity}
              </span>
              <strong>
                {formatMinorMoney(
                  minorAmount(line.total_minor),
                  currency,
                  locale,
                )}
              </strong>
            </li>
          ))}
        </ul>
        <p>
          <strong>
            {formatMinorMoney(minorAmount(order.total_minor), currency, locale)}
          </strong>
        </p>
      </section>
      {delivery ? (
        <address className="account-panel">
          <strong>{delivery.full_name}</strong>
          <br />
          {delivery.line1}
          <br />
          {delivery.city} {delivery.postal_code}
          <br />
          {delivery.country_code}
        </address>
      ) : null}
      <section className="account-panel">
        <h2>{t("orders.timeline")}</h2>
        <ol>
          {order.order_events
            .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
            .map((event) => (
              <li key={event.id}>
                <time dateTime={event.occurred_at}>
                  {new Date(event.occurred_at).toLocaleString(locale)}
                </time>{" "}
                · {event.event_type}
              </li>
            ))}
        </ol>
      </section>
      <section className="account-panel">
        <h2>{returnsT("title")}</h2>
        <p>{returnsT("intro")}</p>
        <Link
          className="button-link"
          href={`/order/${reference}/request`}
          locale={locale}
        >
          {returnsT("returnTab")}
        </Link>
      </section>
    </main>
  );
}
