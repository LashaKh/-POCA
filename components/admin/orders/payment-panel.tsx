import { issueRefundFormAction } from "@/features/orders/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function PaymentPanel({
  locale,
  orderId,
  paymentStatus,
  paymentMethod,
  provider,
  providerReference,
  refundableMinor,
}: {
  locale: AppLocale;
  orderId: string;
  paymentStatus: string;
  paymentMethod: string;
  provider?: string;
  providerReference?: string | null;
  refundableMinor: number;
}) {
  const canRefund =
    ["paid", "partially_refunded"].includes(paymentStatus) &&
    refundableMinor > 0;
  return (
    <section className="admin-panel" aria-labelledby="payment-title">
      <h2 id="payment-title">Payment</h2>
      <dl className="detail-list">
        <div>
          <dt>Method</dt>
          <dd>{paymentMethod}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-chip status-${paymentStatus}`}>
              {paymentStatus}
            </span>
          </dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{provider ?? "—"}</dd>
        </div>
        <div>
          <dt>Provider reference</dt>
          <dd>{providerReference ?? "—"}</dd>
        </div>
      </dl>
      <p className="muted-copy">
        There is no unsafe “force paid” override. Uncertain and mismatched
        states remain in reconciliation.
      </p>
      {canRefund ? (
        <form className="operation-form" action={issueRefundFormAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderId" value={orderId} />
          <input
            type="hidden"
            name="idempotencyKey"
            value={crypto.randomUUID()}
          />
          <label>
            Refund amount in minor units (maximum {refundableMinor})
            <input
              name="amountMinor"
              type="number"
              min={1}
              max={refundableMinor}
              required
            />
          </label>
          <label>
            Reason
            <input name="reason" minLength={2} maxLength={500} required />
          </label>
          {paymentMethod === "bank_transfer" ? (
            <label>
              External refund reference
              <input
                name="providerReference"
                minLength={2}
                maxLength={180}
                required
              />
            </label>
          ) : (
            <input type="hidden" name="providerReference" value="" />
          )}
          <label className="checkbox-field">
            <input type="checkbox" required />
            <span>
              I confirm the amount, reason, and external payment action.
            </span>
          </label>
          <button className="button" type="submit">
            Issue refund
          </button>
        </form>
      ) : null}
    </section>
  );
}
