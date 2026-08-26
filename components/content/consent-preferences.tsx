"use client";

import { useActionState } from "react";

import {
  saveConsentPreferencesAction,
  type ConsentActionState,
} from "@/features/consent/actions";
import type { AppLocale } from "@/i18n/routing";

export function ConsentPreferences({
  locale,
  disclosures,
  current,
  labels,
}: {
  locale: AppLocale;
  disclosures: Record<string, { version: string; copy: string }>;
  current: Record<string, string>;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ConsentActionState, FormData>(
    saveConsentPreferencesAction,
    undefined,
  );
  return (
    <details className="consent-preferences">
      <summary>{labels.manageChoices}</summary>
      <form action={action} className="settings-form-grid">
        <input type="hidden" name="locale" value={locale} />
        <input
          type="hidden"
          name="analyticsDisclosureVersion"
          value={disclosures.analytics?.version ?? "analytics-v1"}
        />
        <input
          type="hidden"
          name="preferencesDisclosureVersion"
          value={disclosures.preferences?.version ?? "preferences-v1"}
        />
        <h2>{labels.consentTitle}</h2>
        <p>{labels.consentIntro}</p>
        <section>
          <h3>{labels.essential}</h3>
          <p>{labels.essentialBody}</p>
        </section>
        <fieldset>
          <legend>{labels.preferences}</legend>
          <p>{disclosures.preferences?.copy}</p>
          <label>
            <input
              type="radio"
              name="preferences"
              value="granted"
              defaultChecked={current.preferences === "granted"}
            />{" "}
            {labels.grant}
          </label>
          <label>
            <input
              type="radio"
              name="preferences"
              value={
                current.preferences === "granted" ? "withdrawn" : "refused"
              }
              defaultChecked={current.preferences !== "granted"}
            />{" "}
            {labels.refuse}
          </label>
        </fieldset>
        <fieldset>
          <legend>{labels.analytics}</legend>
          <p>{disclosures.analytics?.copy}</p>
          <label>
            <input
              type="radio"
              name="analytics"
              value="granted"
              defaultChecked={current.analytics === "granted"}
            />{" "}
            {labels.grant}
          </label>
          <label>
            <input
              type="radio"
              name="analytics"
              value={current.analytics === "granted" ? "withdrawn" : "refused"}
              defaultChecked={current.analytics !== "granted"}
            />{" "}
            {labels.refuse}
          </label>
        </fieldset>
        <button className="button" type="submit" disabled={pending}>
          {labels.saveChoices}
        </button>
        <span role="status">
          {state?.ok ? labels.choicesSaved : state ? labels.failed : ""}
        </span>
      </form>
    </details>
  );
}
