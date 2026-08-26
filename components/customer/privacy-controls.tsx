"use client";

import { useActionState } from "react";

import {
  requestCustomerPrivacyAction,
  type CustomerCommandState,
} from "@/features/customer/actions";
import type { AppLocale } from "@/i18n/routing";

export function PrivacyControls({
  locale,
  labels,
}: {
  locale: AppLocale;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    CustomerCommandState,
    FormData
  >(requestCustomerPrivacyAction, undefined);
  return (
    <form className="account-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <label>
        <span>{labels.requestType}</span>
        <select name="requestType">
          <option value="access">{labels.access}</option>
          <option value="export">{labels.export}</option>
          <option value="correction">{labels.correction}</option>
          <option value="deletion">{labels.deletion}</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <textarea name="reason" required minLength={2} maxLength={500} />
      </label>
      <p>{labels.retention}</p>
      <button className="button" type="submit" disabled={pending}>
        {labels.submit}
      </button>
      {state?.ok ? (
        <p className="notice notice-success" role="status">
          {labels.requested}
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
