import type { QuoteBreakdown } from "@/features/checkout/schema";
import type { SupportedCurrency } from "@/i18n/preferences";
import type { AppLocale } from "@/i18n/routing";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export function CheckoutSummary({
  quote,
  breakdown,
  locale,
  labels,
}: {
  quote: {
    currency: string;
    subtotal_minor: number;
    discount_minor: number;
    tax_minor: number;
    delivery_minor: number;
    total_minor: number;
  };
  breakdown: QuoteBreakdown;
  locale: AppLocale;
  labels: Record<
    "subtotal" | "discount" | "tax" | "delivery" | "total",
    string
  >;
}) {
  const currency = quote.currency as SupportedCurrency;
  const money = (amount: number) =>
    formatMinorMoney(minorAmount(amount), currency, locale);
  return (
    <section
      className="checkout-summary"
      aria-labelledby="checkout-summary-title"
    >
      <h2 id="checkout-summary-title">{labels.total}</h2>
      <ul className="checkout-lines">
        {breakdown.lines.map((line) => (
          <li key={line.cartItemId}>
            <span>
              {line.name} × {line.quantity}
            </span>
            <strong>{money(line.unitAmountMinor * line.quantity)}</strong>
          </li>
        ))}
      </ul>
      <dl className="commerce-totals">
        {(
          [
            [labels.subtotal, quote.subtotal_minor],
            [labels.discount, -quote.discount_minor],
            [labels.tax, quote.tax_minor],
            [labels.delivery, quote.delivery_minor],
            [labels.total, quote.total_minor],
          ] as const
        ).map(([label, amount]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{amount < 0 ? `−${money(-amount)}` : money(amount)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
