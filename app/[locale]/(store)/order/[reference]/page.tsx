import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Notice } from "@/components/ui";
import { getViewerOrder } from "@/features/orders/queries";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, returnsT, record] = await Promise.all([
    getTranslations({ locale, namespace: "commerce" }),
    getTranslations({ locale, namespace: "returns" }),
    getViewerOrder(reference, locale),
  ]);
  if (!record) notFound();
  const { order, lines, address, bankTransfer } = record;
  const currency = order.currency as "GEL" | "USD" | "EUR";
  const money = (value: number) =>
    formatMinorMoney(minorAmount(value), currency, locale);
  return (
    <main className="commerce-page order-confirmation" id="main-content">
      <header className="commerce-header">
        <p className="eyebrow">{t("order.eyebrow")}</p>
        <h1>{t("order.title")}</h1>
        <p>{t("order.reference", { reference: order.reference })}</p>
      </header>
      <Notice tone="success">
        {order.payment_method === "bank_transfer"
          ? t("order.accepted")
          : t("order.acceptedHosted")}
      </Notice>
      <section>
        <h2>{t("order.items")}</h2>
        <ul className="checkout-lines">
          {lines.map((line) => (
            <li key={line.id}>
              <span>
                {line.localized_name} × {line.quantity}
              </span>
              <strong>{money(line.total_minor)}</strong>
            </li>
          ))}
        </ul>
        <p className="order-total">
          {t("totals.total")}: <strong>{money(order.total_minor)}</strong>
        </p>
      </section>
      {order.payment_method === "bank_transfer" && bankTransfer.enabled ? (
        <section className="payment-instructions">
          <h2>{t("order.paymentPending")}</h2>
          <Notice
            tone={bankTransfer.mode === "fixture" ? "warning" : "neutral"}
          >
            {bankTransfer.instructions}
          </Notice>
          <dl>
            <div>
              <dt>{t("checkout.beneficiary")}</dt>
              <dd>{bankTransfer.beneficiary}</dd>
            </div>
            <div>
              <dt>{t("checkout.bank")}</dt>
              <dd>{bankTransfer.bank}</dd>
            </div>
            <div>
              <dt>IBAN</dt>
              <dd>{bankTransfer.iban}</dd>
            </div>
            <div>
              <dt>{t("order.transferReference")}</dt>
              <dd>{order.reference}</dd>
            </div>
          </dl>
          {order.bank_transfer_due_at ? (
            <p>
              {t("order.due", {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "long",
                }).format(new Date(order.bank_transfer_due_at)),
              })}
            </p>
          ) : null}
        </section>
      ) : order.payment_method === "bank_transfer" ? (
        <Notice tone="warning">{t("checkout.paymentDisabled")}</Notice>
      ) : (
        <section className="payment-instructions">
          <h2>{t("order.onlinePayment")}</h2>
          <Notice
            tone={order.payment_status === "paid" ? "success" : "warning"}
          >
            {order.payment_status === "paid"
              ? t("order.onlinePaid")
              : t("order.onlinePending")}
          </Notice>
        </section>
      )}
      {address ? (
        <address>
          {address.full_name}
          <br />
          {address.line1}
          {address.line2 ? (
            <>
              <br />
              {address.line2}
            </>
          ) : null}
          <br />
          {address.city}
          {address.postal_code ? ` ${address.postal_code}` : ""}
          <br />
          {address.country_code}
        </address>
      ) : null}
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
