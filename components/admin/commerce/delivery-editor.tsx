"use client";

import { useActionState } from "react";

import {
  saveShippingMethodAction,
  saveShippingRateAction,
  saveShippingZoneAction,
  type DeliveryActionState,
} from "@/features/delivery/admin-actions";
import type { AppLocale } from "@/i18n/routing";

type Zone = {
  id: string;
  code: string;
  name: string;
  priority: number;
  configuration_status: string;
  legal_status: string;
  version: number;
};
type Method = {
  id: string;
  code: string;
  name_i18n: unknown;
  service_level_i18n: unknown;
  customs_copy_i18n: unknown;
  estimate_min_days: number | null;
  estimate_max_days: number | null;
  manual_quote: boolean;
  configuration_status: string;
  version: number;
};
type Rate = {
  id: string;
  zone_id: string;
  method_id: string;
  currency: string;
  amount_minor: number;
  free_threshold_minor: number | null;
  minimum_subtotal_minor: number;
  maximum_subtotal_minor: number | null;
  delivery_classes: string[];
  priority: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
  version: number;
};

const localized = (value: unknown, locale: string) =>
  value && typeof value === "object" && locale in value
    ? String((value as Record<string, unknown>)[locale] ?? "")
    : "";

function Feedback({
  state,
  labels,
}: {
  state: DeliveryActionState;
  labels: Record<string, string>;
}) {
  return (
    <span role="status">
      {state?.ok ? labels.saved : state ? labels.failed : ""}
    </span>
  );
}

function ZoneForm({
  locale,
  zone,
  countries,
  labels,
}: {
  locale: AppLocale;
  zone?: Zone;
  countries: string[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    DeliveryActionState,
    FormData
  >(saveShippingZoneAction, undefined);
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="zoneId" value={zone?.id ?? ""} />
      <input type="hidden" name="expectedVersion" value={zone?.version ?? 0} />
      <h3>{zone?.name ?? labels.newZone}</h3>
      <label>
        <span>{labels.code}</span>
        <input name="code" defaultValue={zone?.code ?? ""} required />
      </label>
      <label>
        <span>{labels.name}</span>
        <input name="name" defaultValue={zone?.name ?? ""} required />
      </label>
      <label>
        <span>{labels.priority}</span>
        <input
          name="priority"
          type="number"
          defaultValue={zone?.priority ?? 0}
          required
        />
      </label>
      <label>
        <span>{labels.countries}</span>
        <textarea
          name="countryCodes"
          defaultValue={countries.join(", ")}
          required
        />
      </label>
      <label>
        <span>{labels.status}</span>
        <select
          name="configurationStatus"
          defaultValue={zone?.configuration_status ?? "draft"}
        >
          <option value="draft">{labels.draft}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.legalStatus}</span>
        <select
          name="legalStatus"
          defaultValue={zone?.legal_status ?? "draft_unapproved"}
        >
          <option value="draft_unapproved">{labels.draftUnapproved}</option>
          <option value="approved">{labels.approved}</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <Feedback state={state} labels={labels} />
    </form>
  );
}

function MethodForm({
  locale,
  method,
  labels,
}: {
  locale: AppLocale;
  method?: Method;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    DeliveryActionState,
    FormData
  >(saveShippingMethodAction, undefined);
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="methodId" value={method?.id ?? ""} />
      <input
        type="hidden"
        name="expectedVersion"
        value={method?.version ?? 0}
      />
      <h3>{method?.code ?? labels.newMethod}</h3>
      <label>
        <span>{labels.code}</span>
        <input name="code" defaultValue={method?.code ?? ""} required />
      </label>
      {(["ka", "en", "de", "ru"] as const).flatMap((candidate) => [
        <label key={`name-${candidate}`}>
          <span>
            {labels.name} · {candidate.toUpperCase()}
          </span>
          <input
            name={`name${candidate[0].toUpperCase()}${candidate.slice(1)}`}
            defaultValue={localized(method?.name_i18n, candidate)}
            required
          />
        </label>,
        <label key={`service-${candidate}`}>
          <span>
            {labels.serviceLevel} · {candidate.toUpperCase()}
          </span>
          <input
            name={`serviceLevel${candidate[0].toUpperCase()}${candidate.slice(1)}`}
            defaultValue={
              localized(method?.service_level_i18n, candidate) ||
              localized(method?.name_i18n, candidate)
            }
            required
          />
        </label>,
        <label key={`customs-${candidate}`}>
          <span>
            {labels.customs} · {candidate.toUpperCase()}
          </span>
          <textarea
            name={`customs${candidate[0].toUpperCase()}${candidate.slice(1)}`}
            defaultValue={
              localized(method?.customs_copy_i18n, candidate) ||
              labels.pendingLegal
            }
            required
          />
        </label>,
      ])}
      <label>
        <span>{labels.minDays}</span>
        <input
          name="estimateMinDays"
          type="number"
          min="0"
          max="365"
          defaultValue={method?.estimate_min_days ?? 0}
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
          defaultValue={method?.estimate_max_days ?? 0}
          required
        />
      </label>
      <label className="checkbox-field">
        <input
          name="manualQuote"
          type="checkbox"
          defaultChecked={method?.manual_quote}
        />
        <span>{labels.manualQuote}</span>
      </label>
      <label>
        <span>{labels.status}</span>
        <select
          name="configurationStatus"
          defaultValue={method?.configuration_status ?? "draft"}
        >
          <option value="draft">{labels.draft}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <Feedback state={state} labels={labels} />
    </form>
  );
}

function RateForm({
  locale,
  rate,
  zones,
  methods,
  labels,
}: {
  locale: AppLocale;
  rate?: Rate;
  zones: Zone[];
  methods: Method[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    DeliveryActionState,
    FormData
  >(saveShippingRateAction, undefined);
  const now = new Date();
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rateId" value={rate?.id ?? ""} />
      <input type="hidden" name="expectedVersion" value={rate?.version ?? 0} />
      <h3>
        {rate ? `${rate.currency} · ${rate.amount_minor}` : labels.newRate}
      </h3>
      <label>
        <span>{labels.zone}</span>
        <select name="zoneId" defaultValue={rate?.zone_id}>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{labels.method}</span>
        <select name="methodId" defaultValue={rate?.method_id}>
          {methods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.code}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{labels.currency}</span>
        <select name="currency" defaultValue={rate?.currency ?? "GEL"}>
          <option>GEL</option>
          <option>USD</option>
          <option>EUR</option>
        </select>
      </label>
      <label>
        <span>{labels.amountMinor}</span>
        <input
          name="amountMinor"
          type="number"
          min="0"
          defaultValue={rate?.amount_minor ?? 0}
          required
        />
      </label>
      <label>
        <span>{labels.freeThreshold}</span>
        <input
          name="freeThresholdMinor"
          type="number"
          min="0"
          defaultValue={rate?.free_threshold_minor ?? ""}
        />
      </label>
      <label>
        <span>{labels.minimumMinor}</span>
        <input
          name="minimumSubtotalMinor"
          type="number"
          min="0"
          defaultValue={rate?.minimum_subtotal_minor ?? 0}
          required
        />
      </label>
      <label>
        <span>{labels.maximumMinor}</span>
        <input
          name="maximumSubtotalMinor"
          type="number"
          min="0"
          defaultValue={rate?.maximum_subtotal_minor ?? ""}
        />
      </label>
      <label>
        <span>{labels.deliveryClasses}</span>
        <input
          name="deliveryClasses"
          defaultValue={rate?.delivery_classes.join(", ") ?? ""}
        />
      </label>
      <label>
        <span>{labels.priority}</span>
        <input
          name="priority"
          type="number"
          defaultValue={rate?.priority ?? 0}
          required
        />
      </label>
      <label>
        <span>{labels.starts}</span>
        <input
          name="startsAt"
          defaultValue={rate?.starts_at ?? now.toISOString()}
          required
        />
      </label>
      <label>
        <span>{labels.ends}</span>
        <input
          name="endsAt"
          defaultValue={rate?.ends_at ?? "9999-12-31T23:59:59.999Z"}
          required
        />
      </label>
      <label className="checkbox-field">
        <input name="enabled" type="checkbox" defaultChecked={rate?.enabled} />
        <span>{labels.enabled}</span>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} required />
      </label>
      <button
        className="button"
        type="submit"
        disabled={pending || !zones.length || !methods.length}
      >
        {labels.save}
      </button>
      <Feedback state={state} labels={labels} />
    </form>
  );
}

export function DeliveryEditor({
  locale,
  data,
  labels,
}: {
  locale: AppLocale;
  data: {
    zones: Zone[];
    countries: Array<{ zone_id: string; country_code: string }>;
    methods: Method[];
    rates: Rate[];
  };
  labels: Record<string, string>;
}) {
  return (
    <div className="admin-stack">
      <section>
        <h2>{labels.zones}</h2>
        <div className="admin-card-grid">
          <ZoneForm locale={locale} countries={[]} labels={labels} />
          {data.zones.map((zone) => (
            <ZoneForm
              key={zone.id}
              locale={locale}
              zone={zone}
              countries={data.countries
                .filter((item) => item.zone_id === zone.id)
                .map((item) => item.country_code)}
              labels={labels}
            />
          ))}
        </div>
      </section>
      <section>
        <h2>{labels.methods}</h2>
        <div className="admin-card-grid">
          <MethodForm locale={locale} labels={labels} />
          {data.methods.map((method) => (
            <MethodForm
              key={method.id}
              locale={locale}
              method={method}
              labels={labels}
            />
          ))}
        </div>
      </section>
      <section>
        <h2>{labels.rates}</h2>
        <div className="admin-card-grid">
          <RateForm
            locale={locale}
            zones={data.zones}
            methods={data.methods}
            labels={labels}
          />
          {data.rates.map((rate) => (
            <RateForm
              key={rate.id}
              locale={locale}
              rate={rate}
              zones={data.zones}
              methods={data.methods}
              labels={labels}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
