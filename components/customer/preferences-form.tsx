"use client";

import { useActionState } from "react";

import {
  saveCustomerPreferencesAction,
  type CustomerCommandState,
} from "@/features/customer/actions";
import type { AppLocale } from "@/i18n/routing";

export function PreferencesForm({
  locale,
  profile,
  labels,
}: {
  locale: AppLocale;
  profile: { display_name: string | null; display_currency: string };
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    CustomerCommandState,
    FormData
  >(saveCustomerPreferencesAction, undefined);
  return (
    <form className="account-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <label>
        <span>{labels.name}</span>
        <input
          name="displayName"
          defaultValue={profile.display_name ?? ""}
          autoComplete="name"
          required
        />
      </label>
      <label>
        <span>{labels.currency}</span>
        <select name="displayCurrency" defaultValue={profile.display_currency}>
          <option value="GEL">GEL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <label>
        <span>{labels.marketing}</span>
        <select name="marketingChoice" defaultValue="refused">
          <option value="granted">{labels.marketingGranted}</option>
          <option value="refused">{labels.marketingDenied}</option>
          <option value="withdrawn">{labels.marketingWithdrawn}</option>
        </select>
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      {state?.ok ? (
        <p className="notice notice-success" role="status">
          {labels.saved}
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
    </form>
  );
}
