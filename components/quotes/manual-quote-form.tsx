"use client";

import { useActionState, useState } from "react";

import {
  submitManualQuoteAction,
  type QuoteActionState,
} from "@/features/quotes/actions";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function ManualQuoteForm({
  locale,
  initialCountry,
  labels,
}: {
  locale: AppLocale;
  initialCountry?: string;
  labels: Record<string, string>;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState<QuoteActionState, FormData>(
    submitManualQuoteAction,
    undefined,
  );
  if (state?.ok) {
    return (
      <section className="empty-state" aria-live="polite">
        <h2>{labels.submitted}</h2>
        <p>
          {labels.reference}: {state.data.reference}
        </p>
        <Link
          className="button-link"
          href={`/quote/${state.data.reference}`}
          locale={locale}
        >
          {labels.viewStatus}
        </Link>
      </section>
    );
  }
  return (
    <form className="checkout-form admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <fieldset>
        <legend>{labels.contact}</legend>
        <label>
          <span>{labels.email}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          <span>{labels.phone}</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
      </fieldset>
      <fieldset>
        <legend>{labels.address}</legend>
        <label>
          <span>{labels.fullName}</span>
          <input name="fullName" autoComplete="name" required />
        </label>
        <label>
          <span>{labels.organization}</span>
          <input name="organization" autoComplete="organization" />
        </label>
        <label>
          <span>{labels.line1}</span>
          <input name="line1" autoComplete="address-line1" required />
        </label>
        <label>
          <span>{labels.line2}</span>
          <input name="line2" autoComplete="address-line2" />
        </label>
        <label>
          <span>{labels.city}</span>
          <input name="city" autoComplete="address-level2" required />
        </label>
        <label>
          <span>{labels.region}</span>
          <input name="region" autoComplete="address-level1" />
        </label>
        <label>
          <span>{labels.postalCode}</span>
          <input name="postalCode" autoComplete="postal-code" />
        </label>
        <label>
          <span>{labels.country}</span>
          <input
            name="countryCode"
            defaultValue={initialCountry ?? ""}
            pattern="[A-Za-z]{2}"
            maxLength={2}
            autoCapitalize="characters"
            required
          />
        </label>
        <label>
          <span>{labels.instructions}</span>
          <textarea name="instructions" maxLength={500} />
        </label>
      </fieldset>
      <label>
        <span>{labels.note}</span>
        <textarea name="buyerNote" maxLength={2000} />
      </label>
      <p className="notice notice-warning">{labels.noPromise}</p>
      <button className="button" type="submit" disabled={pending}>
        {labels.submit}
      </button>
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
    </form>
  );
}
