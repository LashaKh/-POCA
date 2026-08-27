import { getTranslations, setRequestLocale } from "next-intl/server";

import { CheckoutForm } from "@/components/commerce/checkout/checkout-form";
import { CheckoutSummary } from "@/components/commerce/checkout/checkout-summary";
import { DependencyState, Notice } from "@/components/ui";
import { getCheckoutReview } from "@/features/checkout/service";
import { isAppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getCheckoutCustomerDefaults } from "@/features/customer/queries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const query = await searchParams;
  const [t, review, customerDefaults] = await Promise.all([
    getTranslations({ locale, namespace: "commerce" }),
    query.session ? getCheckoutReview(locale, query.session) : undefined,
    getCheckoutCustomerDefaults(),
  ]);
  if (!review) {
    return (
      <main className="commerce-page" id="main-content">
        <h1>{t("checkout.title")}</h1>
        <Notice tone="error">{t("errors.expired")}</Notice>
        <Link href="/cart" locale={locale}>
          {t("checkout.backToCart")}
        </Link>
      </main>
    );
  }
  const { quote, session, payment, hostedPaymentEnabled } = review;
  return (
    <main className="commerce-page" id="main-content">
      <header className="commerce-header">
        <p className="eyebrow">{t("checkout.eyebrow")}</p>
        <h1>{t("checkout.title")}</h1>
      </header>
      {query.error ? (
        <Notice tone="error">{t("errors.checkout")}</Notice>
      ) : null}
      {quote.breakdown.changed ? (
        <Notice tone="warning">{t("checkout.changed")}</Notice>
      ) : null}
      {!payment.enabled && !hostedPaymentEnabled ? (
        <DependencyState
          state="disabled"
          title={t("checkout.paymentUnavailableTitle")}
          action={
            <Link href="/cart" locale={locale}>
              {t("checkout.backToCart")}
            </Link>
          }
        >
          <p>{t("checkout.paymentDisabled")}</p>
        </DependencyState>
      ) : (
        <div className="commerce-layout">
          <CheckoutForm
            locale={locale}
            checkoutSessionId={session.id}
            expectedTotalMinor={quote.total_minor}
            countryCode={quote.country_code}
            changed={quote.breakdown.changed}
            bankTransferEnabled={payment.enabled}
            hostedPaymentEnabled={hostedPaymentEnabled}
            defaults={customerDefaults}
            labels={{
              contact: t("checkout.contact"),
              email: t("checkout.email"),
              phone: t("checkout.phone"),
              address: t("checkout.address"),
              fullName: t("checkout.fullName"),
              organization: t("checkout.organization"),
              line1: t("checkout.line1"),
              line2: t("checkout.line2"),
              city: t("checkout.city"),
              region: t("checkout.region"),
              postalCode: t("checkout.postalCode"),
              instructions: t("checkout.instructions"),
              acceptChanges: t("checkout.acceptChanges"),
              terms: t("checkout.terms"),
              paymentMethod: t("checkout.paymentMethod"),
              bankTransfer: t("checkout.bankTransfer"),
              hostedPayment: t("checkout.hostedPayment"),
              hostedPaymentHelp: t("checkout.hostedPaymentHelp"),
              placeOrder: t("checkout.placeOrder"),
            }}
          />
          <aside className="cart-aside">
            <CheckoutSummary
              quote={quote}
              breakdown={quote.breakdown}
              locale={locale}
              labels={{
                subtotal: t("totals.subtotal"),
                discount: t("totals.discount"),
                tax: t("totals.tax"),
                delivery: t("totals.delivery"),
                total: t("totals.total"),
              }}
            />
            <section className="payment-instructions">
              <h2>{t("checkout.deliveryDisclosure")}</h2>
              <p>
                {quote.breakdown.customsCopy?.[locale] ??
                  t("checkout.customsPending")}
              </p>
              <p>
                {t("checkout.taxDisplay", {
                  mode:
                    quote.breakdown.taxDisplayMode ?? "pending_legal_review",
                })}
              </p>
            </section>
            {payment.enabled ? (
              <section className="payment-instructions">
                <h2>{t("checkout.bankTransfer")}</h2>
                <p>{payment.instructions}</p>
                <dl>
                  <div>
                    <dt>{t("checkout.beneficiary")}</dt>
                    <dd>{payment.beneficiary}</dd>
                  </div>
                  <div>
                    <dt>{t("checkout.bank")}</dt>
                    <dd>{payment.bank}</dd>
                  </div>
                  <div>
                    <dt>IBAN</dt>
                    <dd>{payment.iban}</dd>
                  </div>
                </dl>
              </section>
            ) : null}
            <Link href="/cart" locale={locale}>
              {t("checkout.backToCart")}
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
