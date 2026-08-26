"use client";

import { useActionState, useState } from "react";

import {
  enrollMfaAction,
  verifyMfaAction,
  type MfaEnrollState,
  type MfaVerifyState,
} from "@/features/auth/mfa-actions";
import type { AppLocale } from "@/i18n/routing";

type Labels = {
  title: string;
  body: string;
  enroll: string;
  scan: string;
  manual: string;
  code: string;
  verify: string;
  failed: string;
};

export function MfaWorkspace({
  locale,
  returnTo,
  verifiedFactorIds,
  labels,
}: {
  locale: AppLocale;
  returnTo: string;
  verifiedFactorIds: string[];
  labels: Labels;
}) {
  const [enrollment, setEnrollment] = useState<MfaEnrollState>();
  const [enrolling, setEnrolling] = useState(false);
  const [verification, verify, verifying] = useActionState<
    MfaVerifyState,
    FormData
  >(verifyMfaAction, undefined);
  const factorId = enrollment?.ok
    ? enrollment.data.factorId
    : verifiedFactorIds[0];

  async function enroll() {
    setEnrolling(true);
    setEnrollment(await enrollMfaAction());
    setEnrolling(false);
  }

  return (
    <section className="auth-form" aria-labelledby="mfa-heading">
      <h1 id="mfa-heading">{labels.title}</h1>
      <p>{labels.body}</p>
      {!factorId ? (
        <button
          className="button"
          type="button"
          onClick={enroll}
          disabled={enrolling}
        >
          {labels.enroll}
        </button>
      ) : null}
      {enrollment?.ok ? (
        <div className="admin-panel mfa-enrollment">
          <p>{labels.scan}</p>
          {/* Supabase returns a local data URI; it is never persisted by ÉPOCA. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.data.qrCode}
            alt=""
            width="220"
            height="220"
            decoding="async"
          />
          <p>
            {labels.manual}: <code>{enrollment.data.secret}</code>
          </p>
        </div>
      ) : null}
      {factorId ? (
        <form action={verify}>
          <input type="hidden" name="factorId" value={factorId} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label>
            <span>{labels.code}</span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button className="button" type="submit" disabled={verifying}>
            {labels.verify}
          </button>
        </form>
      ) : null}
      {(enrollment && !enrollment.ok) || (verification && !verification.ok) ? (
        <p className="field-error" role="alert">
          {labels.failed}
        </p>
      ) : null}
    </section>
  );
}
