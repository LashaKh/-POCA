"use client";

import { useActionState } from "react";

import { signInAction, type SignInState } from "@/features/auth/actions";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export function SignInForm({
  locale,
  returnTo,
  labels,
}: {
  locale: AppLocale;
  returnTo: string;
  labels: { email: string; password: string; submit: string; failed: string };
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInAction,
    undefined,
  );
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label>
        <span>{labels.email}</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>{labels.password}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={12}
        />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.submit}
      </button>
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
      <Link href="/auth/recovery" locale={locale}>
        Recover access
      </Link>
      {returnTo !== "/admin" ? (
        <Link
          href={{ pathname: "/auth/sign-up", query: { returnTo } }}
          locale={locale}
        >
          Create customer account
        </Link>
      ) : null}
    </form>
  );
}
