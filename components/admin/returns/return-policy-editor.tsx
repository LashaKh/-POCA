"use client";

import { useActionState } from "react";

import { configureReturnPolicyAction } from "@/features/returns/policy-actions";
import type { AppLocale } from "@/i18n/routing";

export function ReturnPolicyEditor({
  locale,
  policy,
  labels,
}: {
  locale: AppLocale;
  labels: Record<string, string>;
  policy: {
    version: string;
    cancellation_window_hours: number;
    return_window_days: number;
    allowed_reasons: string[];
    max_evidence_files: number;
    max_evidence_bytes: number;
    restock_mode: string;
    legal_status: string;
  };
}) {
  const t = (key: string, values: Record<string, string | number> = {}) =>
    Object.entries(values).reduce(
      (message, [name, value]) =>
        message.replaceAll(`{${name}}`, String(value)),
      labels[key] ?? key,
    );
  const [state, action, pending] = useActionState(
    configureReturnPolicyAction,
    undefined,
  );
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <label>
        <span>{t("version")}</span>
        <input
          name="version"
          defaultValue={`${policy.version}-next`}
          required
        />
      </label>
      <label>
        <span>{t("cancellationWindow")}</span>
        <input
          name="cancellationWindowHours"
          type="number"
          min="0"
          max="720"
          defaultValue={policy.cancellation_window_hours}
          required
        />
      </label>
      <label>
        <span>{t("returnWindow")}</span>
        <input
          name="returnWindowDays"
          type="number"
          min="0"
          max="365"
          defaultValue={policy.return_window_days}
          required
        />
      </label>
      <label>
        <span>{t("maxFiles")}</span>
        <input
          name="maxEvidenceFiles"
          type="number"
          min="0"
          max="10"
          defaultValue={policy.max_evidence_files}
          required
        />
      </label>
      <label>
        <span>{t("maxBytes")}</span>
        <input
          name="maxEvidenceBytes"
          type="number"
          min="1024"
          max="10485760"
          defaultValue={policy.max_evidence_bytes}
          required
        />
      </label>
      <label>
        <span>{t("restockBehavior")}</span>
        <select name="restockMode" defaultValue={policy.restock_mode}>
          <option value="after_inspection">{t("afterInspection")}</option>
          <option value="never">{t("neverRestock")}</option>
        </select>
      </label>
      <fieldset>
        <legend>{t("buyerReasons")}</legend>
        {[
          "changed_mind",
          "damaged",
          "not_as_described",
          "wrong_item",
          "other",
        ].map((reason) => (
          <label key={reason} className="checkbox-field">
            <input
              name="allowedReasons"
              type="checkbox"
              value={reason}
              defaultChecked={policy.allowed_reasons.includes(reason)}
            />
            <span>{t(`reason_${reason}`)}</span>
          </label>
        ))}
      </fieldset>
      <p className="notice notice-warning">
        {t("legalStatus", { status: policy.legal_status })}
      </p>
      <button className="button" type="submit" disabled={pending}>
        {t("publish")}
      </button>
      {state?.ok ? (
        <p className="notice notice-success" role="status">
          {t("published")}
        </p>
      ) : null}
      {state && !state.ok ? (
        <p className="field-error" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </form>
  );
}
