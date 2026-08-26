"use client";

import { useActionState } from "react";

import {
  subscribeNewsletterAction,
  withdrawNewsletterAction,
  type NewsletterActionState,
} from "@/features/newsletter/actions";
import type { AppLocale } from "@/i18n/routing";

export function NewsletterForm({
  locale,
  disclosureVersion,
  disclosure,
  labels,
}: {
  locale: AppLocale;
  disclosureVersion: string;
  disclosure: string;
  labels: Record<string, string>;
}) {
  const [subscribeState, subscribeAction, subscribing] = useActionState<
    NewsletterActionState,
    FormData
  >(subscribeNewsletterAction, undefined);
  const [withdrawState, withdrawAction, withdrawing] = useActionState<
    NewsletterActionState,
    FormData
  >(withdrawNewsletterAction, undefined);
  return (
    <section className="newsletter-panel" aria-labelledby="newsletter-title">
      <div>
        <p className="eyebrow">ÉPOCA</p>
        <h2 id="newsletter-title">{labels.newsletterTitle}</h2>
        <p>{labels.newsletterIntro}</p>
        <p className="field-hint">{disclosure}</p>
      </div>
      <form action={subscribeAction} className="newsletter-form">
        <input type="hidden" name="locale" value={locale} />
        <input
          type="hidden"
          name="disclosureVersion"
          value={disclosureVersion}
        />
        <label>
          <span>{labels.email}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button className="button" type="submit" disabled={subscribing}>
          {labels.subscribe}
        </button>
        <span role="status">
          {subscribeState?.ok
            ? labels.subscribed
            : subscribeState
              ? labels.failed
              : ""}
        </span>
      </form>
      <details>
        <summary>{labels.withdraw}</summary>
        <form action={withdrawAction} className="newsletter-form">
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>{labels.email}</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button type="submit" disabled={withdrawing}>
            {labels.withdraw}
          </button>
          <span role="status">
            {withdrawState?.ok
              ? labels.withdrawn
              : withdrawState
                ? labels.failed
                : ""}
          </span>
        </form>
      </details>
    </section>
  );
}
