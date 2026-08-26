import { acceptCheckoutAction } from "@/app/[locale]/(store)/checkout/actions";
import type { AppLocale } from "@/i18n/routing";

export function CheckoutForm({
  locale,
  checkoutSessionId,
  expectedTotalMinor,
  countryCode,
  changed,
  bankTransferEnabled,
  hostedPaymentEnabled,
  defaults,
  labels,
}: {
  locale: AppLocale;
  checkoutSessionId: string;
  expectedTotalMinor: number;
  countryCode: string;
  changed: boolean;
  bankTransferEnabled: boolean;
  hostedPaymentEnabled: boolean;
  defaults?: {
    email: string;
    address: {
      full_name: string;
      organization: string | null;
      line1: string;
      line2: string | null;
      city: string;
      region: string | null;
      postal_code: string | null;
      country_code: string;
      phone: string | null;
      instructions: string | null;
    } | null;
  };
  labels: Record<
    | "contact"
    | "email"
    | "phone"
    | "address"
    | "fullName"
    | "organization"
    | "line1"
    | "line2"
    | "city"
    | "region"
    | "postalCode"
    | "instructions"
    | "acceptChanges"
    | "terms"
    | "paymentMethod"
    | "bankTransfer"
    | "hostedPayment"
    | "hostedPaymentHelp"
    | "placeOrder",
    string
  >;
}) {
  return (
    <form className="checkout-form" action={acceptCheckoutAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="checkoutSessionId" value={checkoutSessionId} />
      <input
        type="hidden"
        name="expectedTotalMinor"
        value={expectedTotalMinor}
      />
      <input type="hidden" name="countryCode" value={countryCode} />
      <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
      <input type="hidden" name="termsVersion" value="store-terms-v1" />
      <fieldset>
        <legend>{labels.contact}</legend>
        <label>
          <span>{labels.email}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            defaultValue={defaults?.email}
          />
        </label>
        <label>
          <span>{labels.phone}</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            defaultValue={defaults?.address?.phone ?? ""}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>{labels.paymentMethod}</legend>
        {bankTransferEnabled ? (
          <label className="checkbox-field">
            <input
              name="paymentMethod"
              type="radio"
              value="bank_transfer"
              defaultChecked
              required
            />
            <span>{labels.bankTransfer}</span>
          </label>
        ) : null}
        {hostedPaymentEnabled ? (
          <label className="checkbox-field">
            <input
              name="paymentMethod"
              type="radio"
              value="hosted_payment"
              defaultChecked={!bankTransferEnabled}
              required
            />
            <span>
              {labels.hostedPayment}
              <small>{labels.hostedPaymentHelp}</small>
            </span>
          </label>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>{labels.address}</legend>
        <label>
          <span>{labels.fullName}</span>
          <input
            name="fullName"
            autoComplete="name"
            required
            maxLength={160}
            defaultValue={defaults?.address?.full_name}
          />
        </label>
        <label>
          <span>{labels.organization}</span>
          <input
            name="organization"
            autoComplete="organization"
            maxLength={160}
            defaultValue={defaults?.address?.organization ?? ""}
          />
        </label>
        <label>
          <span>{labels.line1}</span>
          <input
            name="line1"
            autoComplete="address-line1"
            required
            maxLength={200}
            defaultValue={defaults?.address?.line1}
          />
        </label>
        <label>
          <span>{labels.line2}</span>
          <input
            name="line2"
            autoComplete="address-line2"
            maxLength={200}
            defaultValue={defaults?.address?.line2 ?? ""}
          />
        </label>
        <label>
          <span>{labels.city}</span>
          <input
            name="city"
            autoComplete="address-level2"
            required
            maxLength={120}
            defaultValue={defaults?.address?.city}
          />
        </label>
        <label>
          <span>{labels.region}</span>
          <input
            name="region"
            autoComplete="address-level1"
            maxLength={120}
            defaultValue={defaults?.address?.region ?? ""}
          />
        </label>
        <label>
          <span>{labels.postalCode}</span>
          <input
            name="postalCode"
            autoComplete="postal-code"
            maxLength={40}
            defaultValue={defaults?.address?.postal_code ?? ""}
          />
        </label>
        <label>
          <span>{labels.instructions}</span>
          <textarea
            name="instructions"
            maxLength={500}
            defaultValue={defaults?.address?.instructions ?? ""}
          />
        </label>
      </fieldset>
      {changed ? (
        <label className="checkbox-field">
          <input name="acceptChanges" type="checkbox" required />{" "}
          <span>{labels.acceptChanges}</span>
        </label>
      ) : (
        <input type="hidden" name="acceptChanges" value="false" />
      )}
      <label className="checkbox-field">
        <input name="termsAccepted" type="checkbox" required />{" "}
        <span>{labels.terms}</span>
      </label>
      <button className="button" type="submit">
        {labels.placeOrder}
      </button>
    </form>
  );
}
