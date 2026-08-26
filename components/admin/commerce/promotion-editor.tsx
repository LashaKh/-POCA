"use client";

import { useActionState } from "react";

import {
  savePromotionAction,
  type PromotionActionState,
} from "@/features/promotions/admin-actions";
import { normalizePromotionTimestamp } from "@/features/promotions/domain";
import type { AppLocale } from "@/i18n/routing";

export type PromotionValue = {
  id?: string;
  code?: string;
  kind?: string;
  percentage_basis_points?: number | null;
  fixed_amount_minor?: number | null;
  currency?: string | null;
  minimum_subtotal_minor?: number;
  maximum_discount_minor?: number | null;
  usage_limit?: number | null;
  per_subject_limit?: number;
  starts_at?: string;
  ends_at?: string;
  combinability?: string;
  stacking_group?: string | null;
  priority?: number;
  public_name_i18n?: unknown;
  description_i18n?: unknown;
  configuration_status?: string;
  version?: number;
};

const localized = (value: unknown, locale: string) =>
  value && typeof value === "object" && locale in value
    ? String((value as Record<string, unknown>)[locale] ?? "")
    : "";

export function PromotionEditor({
  locale,
  promotion = {},
  labels,
}: {
  locale: AppLocale;
  promotion?: PromotionValue;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    PromotionActionState,
    FormData
  >(savePromotionAction, undefined);
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return (
    <form className="settings-form-grid admin-panel" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="discountId" value={promotion.id ?? ""} />
      <input
        type="hidden"
        name="expectedVersion"
        value={promotion.version ?? 0}
      />
      <label>
        <span>{labels.code}</span>
        <input name="code" defaultValue={promotion.code ?? ""} required />
      </label>
      <label>
        <span>{labels.kind}</span>
        <select name="kind" defaultValue={promotion.kind ?? "percentage"}>
          <option value="percentage">{labels.percentage}</option>
          <option value="fixed">{labels.fixed}</option>
        </select>
      </label>
      <label>
        <span>{labels.basisPoints}</span>
        <input
          name="percentageBasisPoints"
          type="number"
          min="1"
          max="10000"
          defaultValue={promotion.percentage_basis_points ?? 1000}
        />
      </label>
      <label>
        <span>{labels.fixedMinor}</span>
        <input
          name="fixedAmountMinor"
          type="number"
          min="0"
          defaultValue={promotion.fixed_amount_minor ?? ""}
        />
      </label>
      <label>
        <span>{labels.currency}</span>
        <select name="currency" defaultValue={promotion.currency ?? ""}>
          <option value="">—</option>
          <option value="GEL">GEL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <label>
        <span>{labels.minimumMinor}</span>
        <input
          name="minimumSubtotalMinor"
          type="number"
          min="0"
          defaultValue={promotion.minimum_subtotal_minor ?? 0}
          required
        />
      </label>
      <label>
        <span>{labels.maximumMinor}</span>
        <input
          name="maximumDiscountMinor"
          type="number"
          min="0"
          defaultValue={promotion.maximum_discount_minor ?? ""}
        />
      </label>
      <label>
        <span>{labels.usageLimit}</span>
        <input
          name="usageLimit"
          type="number"
          min="1"
          defaultValue={promotion.usage_limit ?? ""}
        />
      </label>
      <label>
        <span>{labels.subjectLimit}</span>
        <input
          name="perSubjectLimit"
          type="number"
          min="1"
          max="100"
          defaultValue={promotion.per_subject_limit ?? 1}
          required
        />
      </label>
      <label>
        <span>{labels.starts}</span>
        <input
          name="startsAt"
          defaultValue={normalizePromotionTimestamp(
            promotion.starts_at,
            now.toISOString(),
          )}
          required
        />
      </label>
      <label>
        <span>{labels.ends}</span>
        <input
          name="endsAt"
          defaultValue={normalizePromotionTimestamp(
            promotion.ends_at,
            nextMonth.toISOString(),
          )}
          required
        />
      </label>
      <label>
        <span>{labels.combinability}</span>
        <select
          name="combinability"
          defaultValue={promotion.combinability ?? "exclusive"}
        >
          <option value="exclusive">{labels.exclusive}</option>
          <option value="same_group">{labels.sameGroup}</option>
          <option value="stackable">{labels.stackable}</option>
        </select>
      </label>
      <label>
        <span>{labels.stackingGroup}</span>
        <input
          name="stackingGroup"
          defaultValue={promotion.stacking_group ?? ""}
        />
      </label>
      <label>
        <span>{labels.priority}</span>
        <input
          name="priority"
          type="number"
          min="-1000"
          max="1000"
          defaultValue={promotion.priority ?? 0}
          required
        />
      </label>
      {(["ka", "en", "de", "ru"] as const).flatMap((candidate) => [
        <label key={`name-${candidate}`}>
          <span>
            {labels.publicName} · {candidate.toUpperCase()}
          </span>
          <input
            name={`publicName${candidate[0].toUpperCase()}${candidate.slice(1)}`}
            defaultValue={localized(promotion.public_name_i18n, candidate)}
            required
          />
        </label>,
        <label key={`description-${candidate}`}>
          <span>
            {labels.description} · {candidate.toUpperCase()}
          </span>
          <textarea
            name={`description${candidate[0].toUpperCase()}${candidate.slice(1)}`}
            defaultValue={localized(promotion.description_i18n, candidate)}
          />
        </label>,
      ])}
      <label>
        <span>{labels.status}</span>
        <select
          name="configurationStatus"
          defaultValue={promotion.configuration_status ?? "draft"}
        >
          <option value="draft">{labels.draft}</option>
          <option value="published">{labels.published}</option>
          <option value="disabled">{labels.disabled}</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <input name="reason" minLength={2} maxLength={500} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}
