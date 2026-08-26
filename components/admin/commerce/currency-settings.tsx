"use client";

import { useActionState } from "react";

import {
  configureCurrencyAction,
  type PricingActionState,
} from "@/features/pricing/admin-actions";
import type { AppLocale } from "@/i18n/routing";

type CurrencySetting = {
  currency: string;
  enabled: boolean;
  checkout_enabled: boolean;
  is_default: boolean;
  display_order: number;
  price_source_mode: "explicit_only" | "approved_rate_snapshot";
  approved_rate_reference: string | null;
  configuration_status: string;
  version: number;
};

function CurrencyForm({
  locale,
  setting,
  labels,
}: {
  locale: AppLocale;
  setting: CurrencySetting;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<PricingActionState, FormData>(
    configureCurrencyAction,
    undefined,
  );
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="currency" value={setting.currency} />
      <input type="hidden" name="expectedVersion" value={setting.version} />
      <h2>{setting.currency}</h2>
      <label className="checkbox-field">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={setting.enabled}
        />
        <span>{labels.enabled}</span>
      </label>
      <label className="checkbox-field">
        <input
          name="checkoutEnabled"
          type="checkbox"
          defaultChecked={setting.checkout_enabled}
        />
        <span>{labels.checkoutEnabled}</span>
      </label>
      <label className="checkbox-field">
        <input
          name="isDefault"
          type="checkbox"
          defaultChecked={setting.is_default}
        />
        <span>{labels.defaultCurrency}</span>
      </label>
      <label>
        <span>{labels.order}</span>
        <input
          name="displayOrder"
          type="number"
          min="0"
          max="1000"
          defaultValue={setting.display_order}
          required
        />
      </label>
      <label>
        <span>{labels.priceSource}</span>
        <select name="priceSourceMode" defaultValue={setting.price_source_mode}>
          <option value="explicit_only">{labels.explicitOnly}</option>
          <option value="approved_rate_snapshot">
            {labels.approvedSnapshot}
          </option>
        </select>
      </label>
      <label>
        <span>{labels.rateReference}</span>
        <input
          name="approvedRateReference"
          defaultValue={setting.approved_rate_reference ?? ""}
          maxLength={200}
        />
      </label>
      <label>
        <span>{labels.status}</span>
        <select
          name="configurationStatus"
          defaultValue={setting.configuration_status}
        >
          <option value="draft">{labels.draft}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} maxLength={500} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <span role="status" aria-live="polite">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}

export function CurrencySettings({
  locale,
  settings,
  labels,
}: {
  locale: AppLocale;
  settings: CurrencySetting[];
  labels: Record<string, string>;
}) {
  return (
    <div className="admin-card-grid">
      {settings.map((setting) => (
        <CurrencyForm
          key={setting.currency}
          locale={locale}
          setting={setting}
          labels={labels}
        />
      ))}
    </div>
  );
}
