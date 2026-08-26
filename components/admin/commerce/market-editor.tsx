"use client";

import { useActionState } from "react";

import {
  saveMarketSettingAction,
  type DeliveryActionState,
} from "@/features/delivery/admin-actions";
import type { AppLocale } from "@/i18n/routing";

type Market = {
  market_code: string;
  country_code: string;
  default_currency: string;
  tax_display_mode: string;
  tax_registration_reference: string | null;
  customs_responsibility: string;
  customs_copy_i18n: unknown;
  legal_status: string;
  enabled: boolean;
  version: number;
};

const localized = (value: unknown, locale: string) =>
  value && typeof value === "object" && locale in value
    ? String((value as Record<string, unknown>)[locale] ?? "")
    : "";

function MarketForm({
  locale,
  market,
  labels,
}: {
  locale: AppLocale;
  market?: Market;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    DeliveryActionState,
    FormData
  >(saveMarketSettingAction, undefined);
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input
        type="hidden"
        name="expectedVersion"
        value={market?.version ?? 0}
      />
      <h2>{market?.market_code ?? labels.newMarket}</h2>
      <label>
        <span>{labels.market}</span>
        <input
          name="marketCode"
          defaultValue={market?.market_code ?? ""}
          required
        />
      </label>
      <label>
        <span>{labels.country}</span>
        <input
          name="countryCode"
          defaultValue={market?.country_code ?? ""}
          pattern="[A-Z]{2}"
          required
        />
      </label>
      <label>
        <span>{labels.defaultCurrency}</span>
        <select
          name="defaultCurrency"
          defaultValue={market?.default_currency ?? "GEL"}
        >
          <option>GEL</option>
          <option>USD</option>
          <option>EUR</option>
        </select>
      </label>
      <label>
        <span>{labels.taxDisplay}</span>
        <select
          name="taxDisplayMode"
          defaultValue={market?.tax_display_mode ?? "pending_legal_review"}
        >
          <option value="included">{labels.taxIncluded}</option>
          <option value="added_at_checkout">{labels.taxAdded}</option>
          <option value="not_applicable">{labels.taxNotApplicable}</option>
          <option value="pending_legal_review">{labels.pendingLegal}</option>
        </select>
      </label>
      <label>
        <span>{labels.taxReference}</span>
        <input
          name="taxRegistrationReference"
          defaultValue={market?.tax_registration_reference ?? ""}
        />
      </label>
      <label>
        <span>{labels.customsResponsibility}</span>
        <select
          name="customsResponsibility"
          defaultValue={
            market?.customs_responsibility ?? "pending_legal_review"
          }
        >
          <option value="buyer_unless_confirmed">
            {labels.buyerUnlessConfirmed}
          </option>
          <option value="seller">{labels.seller}</option>
          <option value="included_by_carrier">{labels.carrierIncluded}</option>
          <option value="pending_legal_review">{labels.pendingLegal}</option>
        </select>
      </label>
      {(["ka", "en", "de", "ru"] as const).map((candidate) => (
        <label key={candidate}>
          <span>
            {labels.customs} · {candidate.toUpperCase()}
          </span>
          <textarea
            name={`customs${candidate[0].toUpperCase()}${candidate.slice(1)}`}
            defaultValue={localized(market?.customs_copy_i18n, candidate)}
            required
          />
        </label>
      ))}
      <label>
        <span>{labels.legalStatus}</span>
        <select
          name="legalStatus"
          defaultValue={market?.legal_status ?? "draft_unapproved"}
        >
          <option value="draft_unapproved">{labels.draftUnapproved}</option>
          <option value="approved">{labels.approved}</option>
        </select>
      </label>
      <label className="checkbox-field">
        <input
          name="enabled"
          type="checkbox"
          defaultChecked={market?.enabled}
        />
        <span>{labels.enabled}</span>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}

export function MarketEditor({
  locale,
  markets,
  labels,
}: {
  locale: AppLocale;
  markets: Market[];
  labels: Record<string, string>;
}) {
  return (
    <div className="admin-card-grid">
      <MarketForm locale={locale} labels={labels} />
      {markets.map((market) => (
        <MarketForm
          key={market.market_code}
          locale={locale}
          market={market}
          labels={labels}
        />
      ))}
    </div>
  );
}
