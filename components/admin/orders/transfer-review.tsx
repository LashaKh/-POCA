import { reviewTransferFormAction } from "@/features/orders/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function TransferReview({
  locale,
  orderId,
  amountMinor,
  currency,
  pendingReconciliation,
}: {
  locale: AppLocale;
  orderId: string;
  amountMinor: number;
  currency: string;
  pendingReconciliation?: {
    id: string;
    external_reference: string | null;
    amount_minor: number | null;
    currency: string | null;
  };
}) {
  return (
    <section className="admin-panel" aria-labelledby="transfer-review-title">
      <h2 id="transfer-review-title">Bank transfer review</h2>
      <p className="muted-copy">
        {pendingReconciliation
          ? "A different Manager must independently confirm the same reference, amount, and decision."
          : "Record the first review. It cannot mark the order paid until another Manager confirms it."}
      </p>
      <form className="operation-form" action={reviewTransferFormAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="orderId" value={orderId} />
        <input
          type="hidden"
          name="reconciliationId"
          value={pendingReconciliation?.id ?? ""}
        />
        <label>
          Transfer reference
          <input
            name="transferReference"
            defaultValue={pendingReconciliation?.external_reference ?? ""}
            required
            maxLength={160}
          />
        </label>
        <label>
          Amount in minor units
          <input
            name="amountMinor"
            type="number"
            min={1}
            defaultValue={pendingReconciliation?.amount_minor ?? amountMinor}
            required
          />
        </label>
        <label>
          Currency
          <input
            name="currency"
            defaultValue={pendingReconciliation?.currency ?? currency}
            pattern="[A-Z]{3}"
            required
          />
        </label>
        <label>
          Private evidence path (optional)
          <input name="evidencePath" maxLength={500} />
        </label>
        <fieldset>
          <legend>Decision</legend>
          <label className="checkbox-field">
            <input
              name="decision"
              type="radio"
              value="matched"
              defaultChecked
            />
            <span>Matched</span>
          </label>
          <label className="checkbox-field">
            <input name="decision" type="radio" value="rejected" />
            <span>Rejected</span>
          </label>
        </fieldset>
        <button className="button" type="submit">
          {pendingReconciliation
            ? "Independently confirm"
            : "Record first review"}
        </button>
      </form>
    </section>
  );
}
