"use client";

import { useActionState, useState } from "react";

import {
  requestManualQuoteInformationAction,
  resolveManualQuoteAction,
  type QuoteActionState,
} from "@/features/quotes/actions";
import type { AppLocale } from "@/i18n/routing";

export function QuoteOperations({
  quote,
  locale,
  labels,
}: {
  quote: { id: string; version: number; status: string; currency: string };
  locale: AppLocale;
  labels: Record<string, string>;
}) {
  const [informationKey] = useState(() => crypto.randomUUID());
  const [resolutionKey] = useState(() => crypto.randomUUID());
  const [defaultExpiry] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString(),
  );
  const [informationState, informationAction, informationPending] =
    useActionState<QuoteActionState, FormData>(
      requestManualQuoteInformationAction,
      undefined,
    );
  const [resolutionState, resolutionAction, resolutionPending] = useActionState<
    QuoteActionState,
    FormData
  >(resolveManualQuoteAction, undefined);
  if (!["submitted", "needs_information"].includes(quote.status)) return null;
  return (
    <section className="admin-stack" aria-labelledby="quote-operations-title">
      <h2 id="quote-operations-title">{labels.operations}</h2>
      <form
        className="settings-form-grid admin-panel"
        action={informationAction}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="quoteId" value={quote.id} />
        <input type="hidden" name="expectedVersion" value={quote.version} />
        <input type="hidden" name="idempotencyKey" value={informationKey} />
        <h3>{labels.requestInformation}</h3>
        <label>
          <span>{labels.buyerMessage}</span>
          <textarea
            name="buyerMessage"
            minLength={2}
            maxLength={2000}
            required
          />
        </label>
        <button className="button" type="submit" disabled={informationPending}>
          {labels.send}
        </button>
        <span role="status">
          {informationState?.ok
            ? labels.saved
            : informationState
              ? labels.failed
              : ""}
        </span>
      </form>
      <form
        className="settings-form-grid admin-panel"
        action={resolutionAction}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="quoteId" value={quote.id} />
        <input type="hidden" name="expectedVersion" value={quote.version} />
        <input type="hidden" name="idempotencyKey" value={resolutionKey} />
        <h3>{labels.resolve}</h3>
        <label>
          <span>{labels.amountMinor}</span>
          <input name="amountMinor" type="number" min="0" required />
        </label>
        <label>
          <span>{labels.currency}</span>
          <select name="currency" defaultValue={quote.currency}>
            <option>GEL</option>
            <option>USD</option>
            <option>EUR</option>
          </select>
        </label>
        {(["Ka", "En", "De", "Ru"] as const).map((candidate) => (
          <label key={candidate}>
            <span>
              {labels.method} · {candidate.toUpperCase()}
            </span>
            <input name={`method${candidate}`} required />
          </label>
        ))}
        <label>
          <span>{labels.minDays}</span>
          <input
            name="estimateMinDays"
            type="number"
            min="0"
            max="365"
            required
          />
        </label>
        <label>
          <span>{labels.maxDays}</span>
          <input
            name="estimateMaxDays"
            type="number"
            min="0"
            max="365"
            required
          />
        </label>
        <label>
          <span>{labels.customsResponsibility}</span>
          <select
            name="customsResponsibility"
            defaultValue="pending_legal_review"
          >
            <option value="buyer_unless_confirmed">
              {labels.buyerUnlessConfirmed}
            </option>
            <option value="seller">{labels.seller}</option>
            <option value="included_by_carrier">
              {labels.carrierIncluded}
            </option>
            <option value="pending_legal_review">{labels.pendingLegal}</option>
          </select>
        </label>
        <label>
          <span>{labels.legalStatus}</span>
          <select name="legalStatus" defaultValue="draft_unapproved">
            <option value="draft_unapproved">{labels.draftUnapproved}</option>
            <option value="approved">{labels.approved}</option>
          </select>
        </label>
        <label>
          <span>{labels.expires}</span>
          <input name="expiresAt" defaultValue={defaultExpiry} required />
        </label>
        <label>
          <span>{labels.staffNote}</span>
          <textarea name="staffNote" maxLength={2000} />
        </label>
        <label>
          <span>{labels.buyerMessage}</span>
          <textarea
            name="buyerMessage"
            minLength={2}
            maxLength={2000}
            required
          />
        </label>
        <button className="button" type="submit" disabled={resolutionPending}>
          {labels.sendQuote}
        </button>
        <span role="status">
          {resolutionState?.ok
            ? labels.saved
            : resolutionState
              ? labels.failed
              : ""}
        </span>
      </form>
    </section>
  );
}
