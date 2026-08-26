"use client";

import { useActionState } from "react";

import {
  bulkCatalogAction,
  type CatalogActionState,
} from "@/features/catalog/admin-actions";
import type { AppLocale } from "@/i18n/routing";

function resultCounts(summary: unknown) {
  if (!summary || typeof summary !== "object")
    return { succeeded: 0, failed: 0 };
  const succeeded =
    "succeeded" in summary && Array.isArray(summary.succeeded)
      ? summary.succeeded.length
      : 0;
  const failed =
    "failed" in summary && Array.isArray(summary.failed)
      ? summary.failed.length
      : 0;
  return { succeeded, failed };
}

export function BulkToolbar({
  locale,
  productIds,
  initialKey,
  collections,
  labels,
}: {
  locale: AppLocale;
  productIds: string[];
  initialKey: string;
  collections: Array<{ id: string; name: string }>;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<CatalogActionState, FormData>(
    bulkCatalogAction,
    undefined,
  );
  const idempotencyKey = state?.correlationId ?? initialKey;
  const counts = state?.ok ? resultCounts(state.data.summary) : undefined;

  return (
    <section className="bulk-toolbar" aria-label={labels.bulkActions}>
      <form action={action} className="bulk-toolbar-form">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productIds" value={productIds.join(",")} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <strong>
          {labels.selected.replace("{count}", String(productIds.length))}
        </strong>
        <label>
          <span>{labels.action}</span>
          <select name="action" defaultValue="publish">
            <option value="publish">{labels.publish}</option>
            <option value="unpublish">{labels.unpublish}</option>
            <option value="archive">{labels.archive}</option>
            <option value="restore">{labels.restore}</option>
            <option value="collection_add">{labels.collectionAdd}</option>
            <option value="collection_remove">{labels.collectionRemove}</option>
          </select>
        </label>
        <label>
          <span>{labels.collection}</span>
          <select name="collectionId" defaultValue="">
            <option value="">{labels.noCollection}</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>
        <label className="bulk-reason">
          <span>{labels.reason}</span>
          <input name="reason" minLength={2} maxLength={500} required />
        </label>
        <button
          className="button"
          type="submit"
          disabled={!productIds.length || pending}
        >
          {pending ? labels.working : labels.confirm}
        </button>
      </form>
      {counts ? (
        <p
          className={counts.failed ? "warning-message" : "success-message"}
          role="status"
        >
          {labels.bulkResult
            .replace("{succeeded}", String(counts.succeeded))
            .replace("{failed}", String(counts.failed))}
        </p>
      ) : state && !state.ok ? (
        <p className="field-error" role="status">
          {labels.failed}
        </p>
      ) : null}
    </section>
  );
}
