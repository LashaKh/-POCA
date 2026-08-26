"use client";

import { useActionState } from "react";

import {
  signUpCustomerAction,
  type CustomerSignUpState,
} from "@/features/auth/customer-actions";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export function CustomerSignUpForm({
  locale,
  returnTo,
  labels,
}: {
  locale: AppLocale;
  returnTo: string;
  labels: Record<
    | "name"
    | "email"
    | "password"
    | "confirmation"
    | "terms"
    | "marketing"
    | "submit"
    | "generic"
    | "failed"
    | "signIn",
    string
  >;
}) {
  const [state, action, pending] = useActionState<
    CustomerSignUpState,
    FormData
  >(signUpCustomerAction, undefined);
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label>
        <span>{labels.name}</span>
        <input
          name="displayName"
          autoComplete="name"
          required
          maxLength={160}
        />
      </label>
      <label>
        <span>{labels.email}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>{labels.password}</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={14}
        />
      </label>
      <label>
        <span>{labels.confirmation}</span>
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={14}
        />
      </label>
      <label className="checkbox-field">
        <input name="termsAccepted" type="checkbox" required />
        <span>{labels.terms}</span>
      </label>
      <label className="checkbox-field">
        <input name="marketingAccepted" type="checkbox" />
        <span>{labels.marketing}</span>
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.submit}
      </button>
      {state?.ok ? (
        <p className="notice notice-success" role="status">
          {labels.generic}
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
      <Link
        href={{ pathname: "/auth/sign-in", query: { returnTo } }}
        locale={locale}
      >
        {labels.signIn}
      </Link>
    </form>
  );
}
