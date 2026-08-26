import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export function AccountNavigation({
  locale,
  labels,
}: {
  locale: AppLocale;
  labels: Record<
    "overview" | "orders" | "addresses" | "wishlist" | "settings",
    string
  >;
}) {
  return (
    <nav className="account-navigation" aria-label={labels.overview}>
      <Link href="/account" locale={locale}>
        {labels.overview}
      </Link>
      <Link href="/account/orders" locale={locale}>
        {labels.orders}
      </Link>
      <Link href="/account/addresses" locale={locale}>
        {labels.addresses}
      </Link>
      <Link href="/account/wishlist" locale={locale}>
        {labels.wishlist}
      </Link>
      <Link href="/account/settings" locale={locale}>
        {labels.settings}
      </Link>
    </nav>
  );
}
