"use client";

import { useActionState } from "react";

import {
  approveMediaAction,
  requestSuggestionAction,
  type ReviewActionState,
} from "@/features/ingestion/review.actions";
import type { AppLocale } from "@/i18n/routing";

import { CropEditor } from "./crop-editor";

export function MediaReview({
  item,
  locale,
  batchId,
  assistanceEnabled,
  labels,
}: {
  item: {
    fileId: string;
    filename: string;
    assetVersion: number;
    previewUrl: string;
    approved: boolean;
  };
  locale: AppLocale;
  batchId: string;
  assistanceEnabled: boolean;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(
    approveMediaAction,
    undefined,
  );
  return (
    <article className="media-review-card">
      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="fileId" value={item.fileId} />
        <input type="hidden" name="assetVersion" value={item.assetVersion} />
        <h3>{item.filename}</h3>
        <CropEditor
          previewUrl={item.previewUrl}
          alt=""
          labels={{
            focalX: labels.focalX,
            focalY: labels.focalY,
            preview: labels.cropPreview,
          }}
        />
        <label>
          <span>{labels.altText}</span>
          <textarea name="altText" required minLength={3} maxLength={500} />
        </label>
        <label>
          <span>{labels.ownership}</span>
          <select name="ownershipBasis" defaultValue="owned">
            <option value="owned">{labels.owned}</option>
            <option value="licensed">{labels.licensed}</option>
            <option value="generated">{labels.generated}</option>
          </select>
        </label>
        <label>
          <span>{labels.creatorSource}</span>
          <input
            name="creatorSource"
            defaultValue="ÉPOCA product photography"
            required
            minLength={2}
            maxLength={300}
          />
        </label>
        <button
          className="button"
          type="submit"
          disabled={pending || item.approved}
        >
          {item.approved ? labels.approved : labels.approveMedia}
        </button>
        {state ? (
          <p
            className={state.ok ? "success-message" : "field-error"}
            role="status"
          >
            {state.ok ? labels.saved : labels.saveFailed}
          </p>
        ) : null}
      </form>
      {assistanceEnabled ? (
        <form action={requestSuggestionAction} className="assistance-request">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="batchId" value={batchId} />
          <input type="hidden" name="fileId" value={item.fileId} />
          <input type="hidden" name="privacyApproved" value="true" />
          <button className="text-button" type="submit">
            {labels.requestSuggestion}
          </button>
        </form>
      ) : (
        <p className="muted-copy">{labels.assistanceDisabled}</p>
      )}
    </article>
  );
}
