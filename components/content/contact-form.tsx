"use client";

import { useActionState, useState } from "react";

import {
  submitContactMessageAction,
  type ContactActionState,
} from "@/features/contact/actions";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function ContactForm({
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
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [state, action, pending] = useActionState<ContactActionState, FormData>(
    submitContactMessageAction,
    undefined,
  );
  if (state?.ok) {
    return (
      <section className="empty-state" aria-live="polite">
        <h2>{labels.received}</h2>
        <p>
          {labels.reference}: {state.data.reference}
        </p>
        <Link
          className="button-link"
          href={`/contact/${state.data.reference}`}
          locale={locale}
        >
          {labels.viewStatus}
        </Link>
      </section>
    );
  }
  return (
    <form className="contact-form admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="disclosureVersion" value={disclosureVersion} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <label>
        <span>{labels.name}</span>
        <input name="fullName" autoComplete="name" required maxLength={160} />
      </label>
      <label>
        <span>{labels.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        <span>{labels.subject}</span>
        <input name="subject" required minLength={2} maxLength={180} />
      </label>
      <label>
        <span>{labels.orderReference}</span>
        <input name="orderReference" maxLength={40} />
      </label>
      <label>
        <span>{labels.message}</span>
        <textarea
          name="message"
          required
          minLength={2}
          maxLength={5000}
          rows={8}
        />
      </label>
      <p className="field-hint">{disclosure}</p>
      <button className="button" type="submit" disabled={pending}>
        {pending ? labels.sending : labels.send}
      </button>
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
    </form>
  );
}
