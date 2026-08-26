import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export function OrderHistory({
  locale,
  orders,
  labels,
}: {
  locale: AppLocale;
  orders: Array<{
    reference: string;
    status: string;
    total_minor: number;
    currency: string;
    accepted_at: string;
    order_lines: Array<{ id: string }>;
  }>;
  labels: Record<string, string>;
}) {
  if (!orders.length) return <p>{labels.empty}</p>;
  return (
    <div className="account-list">
      {orders.map((order) => (
        <article className="account-panel" key={order.reference}>
          <h2>
            <Link href={`/account/orders/${order.reference}`} locale={locale}>
              {order.reference}
            </Link>
          </h2>
          <p>
            {labels.status}: {order.status}
          </p>
          <p>
            {order.order_lines.length} {labels.items}
          </p>
          <p>
            {formatMinorMoney(
              minorAmount(order.total_minor),
              order.currency as "GEL" | "USD" | "EUR",
              locale,
            )}
          </p>
          <time dateTime={order.accepted_at}>
            {new Date(order.accepted_at).toLocaleDateString(locale)}
          </time>
        </article>
      ))}
    </div>
  );
}
