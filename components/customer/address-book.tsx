"use client";

import { useActionState } from "react";

import {
  deleteCustomerAddressAction,
  saveCustomerAddressAction,
  type CustomerCommandState,
} from "@/features/customer/actions";
import type { Database } from "@/lib/supabase/database.types";
import type { AppLocale } from "@/i18n/routing";

type Address = Database["public"]["Tables"]["customer_addresses"]["Row"];

function AddressForm({
  locale,
  address,
  labels,
}: {
  locale: AppLocale;
  address?: Address;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    CustomerCommandState,
    FormData
  >(saveCustomerAddressAction, undefined);
  return (
    <form className="account-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="addressId" value={address?.id ?? ""} />
      <input
        type="hidden"
        name="expectedVersion"
        value={address?.version ?? ""}
      />
      <div className="form-grid">
        <label>
          <span>{labels.label}</span>
          <input
            name="label"
            defaultValue={address?.label}
            required
            maxLength={80}
          />
        </label>
        <label>
          <span>{labels.fullName}</span>
          <input
            name="fullName"
            defaultValue={address?.full_name}
            autoComplete="name"
            required
            maxLength={160}
          />
        </label>
        <label>
          <span>{labels.organization}</span>
          <input
            name="organization"
            defaultValue={address?.organization ?? ""}
            autoComplete="organization"
            maxLength={160}
          />
        </label>
        <label>
          <span>{labels.line1}</span>
          <input
            name="line1"
            defaultValue={address?.line1}
            autoComplete="address-line1"
            required
            maxLength={200}
          />
        </label>
        <label>
          <span>{labels.line2}</span>
          <input
            name="line2"
            defaultValue={address?.line2 ?? ""}
            autoComplete="address-line2"
            maxLength={200}
          />
        </label>
        <label>
          <span>{labels.city}</span>
          <input
            name="city"
            defaultValue={address?.city}
            autoComplete="address-level2"
            required
            maxLength={120}
          />
        </label>
        <label>
          <span>{labels.region}</span>
          <input
            name="region"
            defaultValue={address?.region ?? ""}
            autoComplete="address-level1"
            maxLength={120}
          />
        </label>
        <label>
          <span>{labels.postalCode}</span>
          <input
            name="postalCode"
            defaultValue={address?.postal_code ?? ""}
            autoComplete="postal-code"
            maxLength={40}
          />
        </label>
        <label>
          <span>{labels.country}</span>
          <input
            name="countryCode"
            defaultValue={address?.country_code ?? "GE"}
            autoComplete="country"
            required
            pattern="[A-Za-z]{2}"
            maxLength={2}
          />
        </label>
        <label>
          <span>{labels.phone}</span>
          <input
            name="phone"
            defaultValue={address?.phone ?? ""}
            autoComplete="tel"
            maxLength={40}
          />
        </label>
      </div>
      <label>
        <span>{labels.instructions}</span>
        <textarea
          name="instructions"
          defaultValue={address?.instructions ?? ""}
          maxLength={500}
        />
      </label>
      <label className="checkbox-field">
        <input
          name="isDefault"
          type="checkbox"
          defaultChecked={address?.is_default}
        />
        <span>{labels.default}</span>
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

export function AddressBook({
  locale,
  addresses,
  labels,
}: {
  locale: AppLocale;
  addresses: Address[];
  labels: Record<string, string>;
}) {
  return (
    <div className="address-book">
      {addresses.map((address) => (
        <details key={address.id} className="account-panel">
          <summary>
            {address.label}
            {address.is_default ? ` · ${labels.default}` : ""}
          </summary>
          <AddressForm locale={locale} address={address} labels={labels} />
          <form action={deleteCustomerAddressAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="addressId" value={address.id} />
            <input
              type="hidden"
              name="expectedVersion"
              value={address.version}
            />
            <button className="text-button" type="submit">
              {labels.delete}
            </button>
          </form>
        </details>
      ))}
      <details className="account-panel" open={addresses.length === 0}>
        <summary>{labels.add}</summary>
        <AddressForm locale={locale} labels={labels} />
      </details>
    </div>
  );
}
