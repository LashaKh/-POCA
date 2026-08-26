"use client";

import { useActionState } from "react";

import {
  requestRecoveryAction,
  updateRecoveredPasswordAction,
  type RecoveryState,
} from "@/features/auth/recovery-actions";
import type { AppLocale } from "@/i18n/routing";

export function RecoveryForm({
  locale,
  update,
  labels,
}: {
  locale: AppLocale;
  update: boolean;
  labels: {
    email: string;
    password: string;
    confirmation: string;
    submit: string;
    generic: string;
    failed: string;
  };
}) {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(
    update ? updateRecoveredPasswordAction : requestRecoveryAction,
    undefined,
  );
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      {update ? (
        <>
          <label>
            <span>{labels.password}</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={14}
              required
            />
          </label>
          <label>
            <span>{labels.confirmation}</span>
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={14}
              required
            />
          </label>
        </>
      ) : (
        <label>
          <span>{labels.email}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
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
    </form>
  );
}
