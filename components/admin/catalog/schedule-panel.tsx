"use client";

import { useActionState } from "react";

import {
  scheduleCatalogProductAction,
  type CatalogActionState,
} from "@/features/catalog/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function SchedulePanel({
  locale,
  productId,
  version,
  defaultScheduledAt,
  labels,
}: {
  locale: AppLocale;
  productId: string;
  version: number;
  defaultScheduledAt: string;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<CatalogActionState, FormData>(
    scheduleCatalogProductAction,
    undefined,
  );

  return (
    <section className="admin-panel" aria-labelledby="schedule-product-heading">
      <p className="eyebrow">{labels.changeControl}</p>
      <h2 id="schedule-product-heading">{labels.schedule}</h2>
      <p className="muted-copy">{labels.scheduleHelp}</p>
      <form action={action} className="review-field-grid">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="expectedVersion" value={version} />
        <label>
          <span>{labels.scheduledAt}</span>
          <input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={defaultScheduledAt}
            required
          />
        </label>
        <label>
          <span>{labels.scheduleReason}</span>
          <input name="reason" minLength={2} maxLength={500} required />
        </label>
        <div className="button-row field-wide">
          <button className="button" type="submit" disabled={pending}>
            {pending ? labels.working : labels.schedule}
          </button>
          {state ? (
            <p
              className={state.ok ? "success-message" : "field-error"}
              role="status"
            >
              {state.ok
                ? labels.scheduleSaved
                : state.error.code === "VERSION_CONFLICT"
                  ? labels.versionConflict
                  : labels.failed}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
