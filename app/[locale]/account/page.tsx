import { getTranslations } from "next-intl/server";

import { Notice } from "@/components/ui";
import { getCustomerAccountOverview } from "@/features/customer/queries";
import { isAppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    welcome?: string;
    verified?: string;
    merged?: string;
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isAppLocale(locale)) return null;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "account" }),
    getCustomerAccountOverview(locale),
  ]);
  return (
    <main className="account-page" id="main-content">
      <header className="account-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("overview.title")}</h1>
        <p>
          {t("overview.greeting", {
            name: data.profile.display_name ?? t("overview.customer"),
          })}
        </p>
      </header>
      {query.welcome || query.verified || query.merged ? (
        <Notice tone="success">{t("overview.merged")}</Notice>
      ) : null}
      {data.account.status === "deletion_requested" ? (
        <Notice tone="warning">{t("overview.deletionPending")}</Notice>
      ) : null}
      <div className="account-summary-grid">
        <Link className="account-panel" href="/account/orders" locale={locale}>
          <strong>{data.orders.length}</strong>
          <span>{t("nav.orders")}</span>
        </Link>
        <Link
          className="account-panel"
          href="/account/addresses"
          locale={locale}
        >
          <strong>{data.addresses.length}</strong>
          <span>{t("nav.addresses")}</span>
        </Link>
        <Link
          className="account-panel"
          href="/account/wishlist"
          locale={locale}
        >
          <strong>{data.wishlistProductIds.length}</strong>
          <span>{t("nav.wishlist")}</span>
        </Link>
        <Link
          className="account-panel"
          href="/account/settings"
          locale={locale}
        >
          <strong>
            {data.sessions.filter((session) => !session.revoked_at).length}
          </strong>
          <span>{t("settings.sessions")}</span>
        </Link>
      </div>
    </main>
  );
}
