"use client";

import { useActionState } from "react";

import {
  transitionContactMessageAction,
  type ContactAdminActionState,
} from "@/features/contact/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function ContactOperations({
  locale,
  submission,
  labels,
}: {
  locale: AppLocale;
  submission: { id: string; status: string; version: number };
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<
    ContactAdminActionState,
    FormData
  >(transitionContactMessageAction, undefined);
  return (
    <form className="admin-panel settings-form-grid" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="contactSubmissionId" value={submission.id} />
      <input type="hidden" name="expectedVersion" value={submission.version} />
      <h2>{labels.workflow}</h2>
      <p>
        {labels.current}: <strong>{submission.status}</strong>
      </p>
      <label>
        <span>{labels.target}</span>
        <select name="targetStatus" defaultValue="in_review">
          <option value="in_review">in review</option>
          <option value="responded">responded</option>
          <option value="closed">closed</option>
          <option value="spam">spam</option>
        </select>
      </label>
      <label>
        <span>{labels.reason}</span>
        <textarea name="safeNote" minLength={2} maxLength={1000} required />
      </label>
      <button className="button" type="submit" disabled={pending}>
        {labels.apply}
      </button>
      <span role="status">
        {state?.ok ? labels.saved : state ? labels.failed : ""}
      </span>
    </form>
  );
}
