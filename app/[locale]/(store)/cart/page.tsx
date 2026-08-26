import { getTranslations, setRequestLocale } from "next-intl/server";

import { CartLine } from "@/components/commerce/cart/cart-line";
import { CartSummary } from "@/components/commerce/cart/cart-summary";
import { DeliverySelector } from "@/components/commerce/checkout/delivery-selector";
import { DiscountForm } from "@/components/commerce/cart/discount-form";
import { Notice } from "@/components/ui";
import { getGuestCart } from "@/features/cart/queries";
import { isAppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getPublishedDeliveryOptions } from "@/features/delivery/queries";

export const dynamic = "force-dynamic";

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, cart, query] = await Promise.all([
    getTranslations({ locale, namespace: "commerce" }),
    getGuestCart(),
    searchParams,
  ]);
  const deliveryOptions = cart
    ? await getPublishedDeliveryOptions(cart.currency)
    : [];
  return (
    <main className="commerce-page" id="main-content">
      <header className="commerce-header">
        <p className="eyebrow">{t("cart.eyebrow")}</p>
        <h1>{t("cart.title")}</h1>
      </header>
      {query.error ? (
        <Notice tone="error">{t("errors.checkout")}</Notice>
      ) : null}
      {!cart?.items.length ? (
        <section className="empty-state">
          <h2>{t("cart.empty")}</h2>
          <p>{t("cart.emptyBody")}</p>
          <Link className="button-link" href="/" locale={locale}>
            {t("cart.continueShopping")}
          </Link>
        </section>
      ) : (
        <div className="commerce-layout">
          <section className="cart-lines" aria-label={t("cart.items")}>
            {cart.items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                currency={cart.currency}
                locale={locale}
                labels={{
                  quantity: t("cart.quantity"),
                  update: t("cart.update"),
                  remove: t("cart.remove"),
                  failed: t("cart.actionFailed"),
                }}
              />
            ))}
          </section>
          <aside className="cart-aside">
            <CartSummary
              cart={cart}
              locale={locale}
              labels={{
                subtotal: t("totals.subtotal"),
                exactAtCheckout: t("cart.exactAtCheckout"),
              }}
            />
            <DiscountForm
              locale={locale}
              currentCode={cart.discountCode ?? undefined}
              labels={{
                code: t("cart.discountCode"),
                apply: t("cart.applyDiscount"),
                applied: t("cart.discountApplied"),
                failed: t("cart.discountFailed"),
              }}
            />
            <h2>{t("checkout.deliveryTitle")}</h2>
            <DeliverySelector
              locale={locale}
              options={deliveryOptions}
              labels={{
                country: t("checkout.country"),
                method: t("checkout.deliveryMethod"),
                continue: t("checkout.review"),
                standard: t("checkout.standardDelivery"),
                worldwide: t("checkout.worldwideQuote"),
                manualQuoteLink: t("checkout.manualQuoteLink"),
              }}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
