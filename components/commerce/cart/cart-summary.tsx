import type { CartView } from "@/features/cart/schema";
import type { AppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export function CartSummary({
  cart,
  locale,
  labels,
}: {
  cart: CartView;
  locale: AppLocale;
  labels: { subtotal: string; exactAtCheckout: string };
}) {
  const subtotal = cart.items.reduce(
    (total, item) => total + item.unitAmountMinor * item.quantity,
    0,
  );
  return (
    <dl className="commerce-totals">
      <div>
        <dt>{labels.subtotal}</dt>
        <dd>
          {formatMinorMoney(minorAmount(subtotal), cart.currency, locale)}
        </dd>
      </div>
      <div>
        <dt>{labels.exactAtCheckout}</dt>
        <dd>—</dd>
      </div>
    </dl>
  );
}
