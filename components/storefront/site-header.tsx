import { getTranslations } from "next-intl/server";

import type { SupportedCurrency } from "@/i18n/preferences";
import { getCartSummary } from "@/features/cart/queries";
import { getPublishedMenu } from "@/features/content/queries";
import { getWishlistSummary } from "@/features/wishlist/queries";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import { CurrencyControl, LocaleNavigation } from "./preference-controls";

export async function SiteHeader({
  locale,
  currency,
  currencies,
}: {
  locale: AppLocale;
  currency: SupportedCurrency;
  currencies: SupportedCurrency[];
}) {
  const [t, catalog, commerce, content, cart, wishlist, managedMenu] =
    await Promise.all([
      getTranslations({ locale, namespace: "common" }),
      getTranslations({ locale, namespace: "catalog" }),
      getTranslations({ locale, namespace: "commerce" }),
      getTranslations({ locale, namespace: "content" }),
      getCartSummary(currency),
      getWishlistSummary(),
      getPublishedMenu("header", locale),
    ]);

  const navigation = managedMenu.length
    ? managedMenu
    : [
        {
          key: "collection",
          path: "/search",
          label: t("home"),
        },
        { key: "journal", path: "/journal", label: content("journal") },
        { key: "about", path: "/about", label: t("about") },
        { key: "contact", path: "/contact", label: t("contact") },
      ];

  return (
    <header className="site-header">
      <Link className="brand" href="/" locale={locale} aria-label={t("home")}>
        {t("brand")}
      </Link>
      <nav className="primary-navigation" aria-label={catalog("navigation")}>
        {navigation.map((item) => (
          <Link
            href={
              (item.path ?? "/").replace(/^\/(ka|en|de|ru)(?=\/|$)/, "") || "/"
            }
            key={item.key}
            locale={locale}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <form
        className="header-search"
        action={`/${locale}/search`}
        role="search"
      >
        <label className="visually-hidden" htmlFor="site-search">
          {catalog("search")}
        </label>
        <input
          id="site-search"
          name="q"
          type="search"
          placeholder={catalog("searchPlaceholder")}
          maxLength={100}
        />
        <button type="submit">{catalog("search")}</button>
      </form>
      <div className="site-utilities">
        <Link href="/account" locale={locale}>
          {t("account")}
        </Link>
        <Link href="/account/wishlist" locale={locale}>
          {commerce("wishlist.link", { count: wishlist.count })}
        </Link>
        <Link className="cart-link" href="/cart" locale={locale}>
          {commerce("cart.link", { count: cart.quantity })}
        </Link>
        <LocaleNavigation locale={locale} label={t("language")} />
        <CurrencyControl
          currency={currency}
          currencies={currencies}
          label={t("currency")}
          applyLabel={catalog("apply")}
        />
      </div>
    </header>
  );
}
