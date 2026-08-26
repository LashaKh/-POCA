"use client";

import { useActionState, useState } from "react";

import {
  respondManualQuoteAction,
  type QuoteActionState,
} from "@/features/quotes/actions";
import type { ManualQuoteView } from "@/features/quotes/queries";
import type { AppLocale } from "@/i18n/routing";
import { formatBusinessDateTime } from "@/lib/datetime/format";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export function ManualQuoteStatus({
  quote,
  locale,
  labels,
}: {
  quote: ManualQuoteView;
  locale: AppLocale;
  labels: Record<string, string>;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState<QuoteActionState, FormData>(
    respondManualQuoteAction,
    undefined,
  );
  const status = state?.ok ? "updated" : quote.status;
  const method = quote.quoted_method_i18n?.[locale];
  const responsibility = quote.customs_snapshot?.responsibility;
  const legalStatus = quote.customs_snapshot?.legalStatus;
  return (
    <div className="admin-stack">
      <section className="admin-panel">
        <p className="eyebrow">{quote.reference}</p>
        <h2>
          {labels.status}: {labels[`status_${status}`] ?? status}
        </h2>
        <dl className="commerce-totals">
          <div>
            <dt>{labels.destination}</dt>
            <dd>{quote.destination_country_code}</dd>
          </div>
          {quote.quoted_amount_minor !== null && quote.quoted_currency ? (
            <div>
              <dt>{labels.deliveryAmount}</dt>
              <dd>
                {formatMinorMoney(
                  minorAmount(quote.quoted_amount_minor),
                  quote.quoted_currency,
                  locale,
                )}
              </dd>
            </div>
          ) : null}
          {method ? (
            <div>
              <dt>{labels.method}</dt>
              <dd>{String(method)}</dd>
            </div>
          ) : null}
          {quote.estimate_min_days !== null ? (
            <div>
              <dt>{labels.estimate}</dt>
              <dd>
                {quote.estimate_min_days}–{quote.estimate_max_days}{" "}
                {labels.days}
              </dd>
            </div>
          ) : null}
        </dl>
        {quote.buyer_message ? <p>{quote.buyer_message}</p> : null}
        {responsibility ? (
          <p className="notice notice-warning">
            {labels.customs}: {String(responsibility)} · {labels.legalStatus}:{" "}
            {String(legalStatus)}
          </p>
        ) : null}
        {quote.expires_at ? (
          <p>
            {labels.expires}: {formatBusinessDateTime(quote.expires_at)}
          </p>
        ) : null}
      </section>
      {quote.status === "quoted" && !state?.ok ? (
        <form className="admin-panel action-row" action={action}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="quoteId" value={quote.id} />
          <input type="hidden" name="reference" value={quote.reference} />
          <input type="hidden" name="expectedVersion" value={quote.version} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <button
            className="button"
            name="response"
            value="accept"
            disabled={pending}
          >
            {labels.accept}
          </button>
          <button
            className="text-button"
            name="response"
            value="decline"
            disabled={pending}
          >
            {labels.decline}
          </button>
          {state && !state.ok ? (
            <p className="field-error" role="alert">
              {labels.failed}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
