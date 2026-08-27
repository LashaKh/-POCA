import { getTranslations } from "next-intl/server";

import type { SupportedCurrency } from "@/i18n/preferences";
import { getCartSummary } from "@/features/cart/queries";
import { getPublishedMenu } from "@/features/content/queries";
import { getWishlistSummary } from "@/features/wishlist/queries";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { AccountIcon, BagIcon, HeartIcon } from "@/components/ui";

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
          path: "/collections",
          label: catalog("collectionsTitle"),
        },
        { key: "journal", path: "/journal", label: content("journal") },
        { key: "about", path: "/about", label: t("about") },
        { key: "contact", path: "/contact", label: t("contact") },
      ];

  const renderNavigationLinks = () =>
    navigation.map((item) => (
      <Link
        href={(item.path ?? "/").replace(/^\/(ka|en|de|ru)(?=\/|$)/, "") || "/"}
        key={item.key}
        locale={locale}
      >
        {item.label}
      </Link>
    ));

  return (
    <header className="site-header">
      <div className="site-header-main">
        <Link className="brand" href="/" locale={locale} aria-label={t("home")}>
          {t("brand")}
        </Link>
        <form
          className="header-search"
          action={`/${locale}/search`}
          role="search"
        >
          <label htmlFor="site-search">{catalog("search")}</label>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder={catalog("searchPlaceholder")}
            maxLength={100}
          />
          <button type="submit">{catalog("search")}</button>
        </form>
        <nav
          className="site-commerce-navigation"
          aria-label={t("commerceNavigation")}
        >
          <Link href="/account" locale={locale} aria-label={t("account")}>
            <AccountIcon className="commerce-icon" />
            <span className="commerce-link-label">{t("account")}</span>
          </Link>
          <Link
            href="/account/wishlist"
            locale={locale}
            aria-label={commerce("wishlist.link", { count: wishlist.count })}
          >
            <HeartIcon className="commerce-icon" />
            <span className="commerce-link-label">
              {commerce("wishlist.link", { count: wishlist.count })}
            </span>
            <span className="commerce-link-count" aria-hidden="true">
              {wishlist.count}
            </span>
          </Link>
          <Link
            className="cart-link"
            href="/cart"
            locale={locale}
            aria-label={commerce("cart.link", { count: cart.quantity })}
          >
            <BagIcon className="commerce-icon" />
            <span className="commerce-link-label">
              {commerce("cart.link", { count: cart.quantity })}
            </span>
            <span className="commerce-link-count" aria-hidden="true">
              {cart.quantity}
            </span>
          </Link>
        </nav>
      </div>
      <div className="site-header-bar site-header-bar-desktop">
        <nav className="primary-navigation" aria-label={catalog("navigation")}>
          {renderNavigationLinks()}
        </nav>
        <div className="site-preferences">
          <LocaleNavigation locale={locale} label={t("language")} />
          <CurrencyControl
            currency={currency}
            currencies={currencies}
            label={t("currency")}
            applyLabel={catalog("apply")}
            controlId="site-currency-desktop"
          />
        </div>
      </div>
      <details className="site-navigation-drawer">
        <summary>
          <span>{catalog("navigation")}</span>
          <span className="navigation-drawer-mark" aria-hidden="true" />
        </summary>
        <div className="site-header-bar site-header-bar-mobile">
          <nav
            className="primary-navigation"
            aria-label={catalog("navigation")}
          >
            {renderNavigationLinks()}
          </nav>
          <div className="site-preferences">
            <LocaleNavigation locale={locale} label={t("language")} />
            <CurrencyControl
              currency={currency}
              currencies={currencies}
              label={t("currency")}
              applyLabel={catalog("apply")}
              controlId="site-currency-mobile"
            />
          </div>
        </div>
      </details>
    </header>
  );
}
