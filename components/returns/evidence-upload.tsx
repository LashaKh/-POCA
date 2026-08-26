"use client";

import { useActionState } from "react";

import {
  uploadReturnEvidenceAction,
  type ReturnEvidenceState,
} from "@/features/returns/evidence";
import type { AppLocale } from "@/i18n/routing";

export function ReturnEvidenceUpload({
  locale,
  returnRequestId,
  orderReference,
  labels,
}: {
  locale: AppLocale;
  returnRequestId: string;
  orderReference: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    ReturnEvidenceState,
    FormData
  >(uploadReturnEvidenceAction, undefined);
  return (
    <form className="account-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="returnRequestId" value={returnRequestId} />
      <input type="hidden" name="orderReference" value={orderReference} />
      <label>
        <span>{labels.file}</span>
        <input
          name="evidence"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </label>
      <p>{labels.limits}</p>
      <button className="button" type="submit" disabled={pending}>
        {labels.upload}
      </button>
      {state?.ok ? (
        <p className="notice notice-success" role="status">
          {labels.uploaded}
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
