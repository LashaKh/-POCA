"use client";

import { useActionState } from "react";

import {
  submitReturnRequestAction,
  type ReturnCommandState,
} from "@/features/returns/actions";
import type { ReturnEligibility } from "@/features/returns/eligibility";
import type { AppLocale } from "@/i18n/routing";

export function ReturnRequestForm({
  locale,
  orderReference,
  requestKind,
  idempotencyToken,
  lines,
  eligibility,
  labels,
}: {
  locale: AppLocale;
  orderReference: string;
  requestKind: "cancellation" | "return";
  idempotencyToken: string;
  lines: Array<{ id: string; name: string; quantity: number }>;
  eligibility: ReturnEligibility;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ReturnCommandState, FormData>(
    submitReturnRequestAction,
    undefined,
  );
  return (
    <section className="account-panel return-request-panel">
      <h2>
        {requestKind === "cancellation"
          ? labels.cancellationTitle
          : labels.returnTitle}
      </h2>
      {eligibility.legalStatus === "draft_unapproved" ? (
        <p className="notice notice-warning">{labels.legalDraft}</p>
      ) : null}
      {!eligibility.eligible ? (
        <div className="notice notice-warning" role="status">
          <strong>{labels.ineligible}</strong>
          <p>
            {labels[`reason_${eligibility.reasonCode}`] ??
              eligibility.reasonCode}
          </p>
          <p>{labels.support}</p>
        </div>
      ) : (
        <form className="account-form" action={action}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="orderReference" value={orderReference} />
          <input type="hidden" name="requestKind" value={requestKind} />
          <input
            type="hidden"
            name="idempotencyToken"
            value={idempotencyToken}
          />
          {requestKind === "return" ? (
            <label>
              <span>{labels.item}</span>
              <select name="lineId" required>
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {requestKind === "return" ? (
            <label>
              <span>{labels.quantity}</span>
              <input
                name="quantity"
                type="number"
                min="1"
                max="20"
                defaultValue="1"
                required
              />
            </label>
          ) : null}
          <label>
            <span>{labels.reason}</span>
            <select name="reasonCode" required>
              {eligibility.allowedReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {labels[`reason_${reason}`] ?? reason}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{labels.note}</span>
            <textarea
              name="buyerNote"
              minLength={2}
              maxLength={2000}
              required
            />
          </label>
          {eligibility.deadline ? (
            <p>
              {labels.deadline}:{" "}
              {new Date(eligibility.deadline).toLocaleDateString(locale)}
            </p>
          ) : null}
          <button className="button" type="submit" disabled={pending}>
            {labels.submit}
          </button>
          {state?.ok ? (
            <div className="notice notice-success" role="status">
              <p>
                {labels.submitted}: <strong>{state.data.reference}</strong>
              </p>
              <a
                href={`/${locale}/order/${orderReference}/request?returnId=${state.data.id}`}
              >
                {labels.viewStatus}
              </a>
            </div>
          ) : null}
          {state && !state.ok ? (
            <p className="field-error" role="alert">
              {labels.failed}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
