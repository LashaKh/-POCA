"use client";

import { useActionState } from "react";

import {
  createContentPreviewAction,
  saveContentEntryAction,
  transitionContentEntryAction,
  type ContentActionState,
} from "@/features/content/admin-actions";
import type { AppLocale } from "@/i18n/routing";

type Entry = {
  id: string;
  entry_key: string;
  content_type: string;
  status: string;
  fallback_policy: string;
  legal_status: string;
  publish_at: string | null;
  unpublish_at: string | null;
  version: number;
};

type Translation = {
  locale: string;
  slug: string;
  title: string;
  summary: string | null;
  blocks: unknown;
  meta_title: string | null;
  meta_description: string | null;
  social_image_url: string | null;
  review_status: string;
};

const editorLocales = ["ka", "en", "de", "ru"] as const;
const emptyBlocks = JSON.stringify([{ type: "paragraph", text: "" }], null, 2);

function localInputDate(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

export function ContentEditor({
  locale,
  entry,
  translations,
  labels,
}: {
  locale: AppLocale;
  entry: Entry | null;
  translations: Translation[];
  labels: Record<string, string>;
}) {
  const [saveState, saveAction, saving] = useActionState<
    ContentActionState,
    FormData
  >(saveContentEntryAction, undefined);
  const [transitionState, transitionAction, transitioning] = useActionState<
    ContentActionState,
    FormData
  >(transitionContentEntryAction, undefined);
  const [previewState, previewAction, previewing] = useActionState<
    ContentActionState,
    FormData
  >(createContentPreviewAction, undefined);
  const byLocale = new Map(
    translations.map((translation) => [translation.locale, translation]),
  );
  return (
    <div className="content-editor-layout">
      <form className="admin-panel settings-form-grid" action={saveAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="contentEntryId" value={entry?.id ?? ""} />
        <input
          type="hidden"
          name="expectedVersion"
          value={entry?.version ?? 0}
        />
        <h2>{entry ? labels.edit : labels.create}</h2>
        <label>
          <span>{labels.key}</span>
          <input
            name="entryKey"
            defaultValue={entry?.entry_key ?? ""}
            pattern="[a-z][a-z0-9-]+"
            required
          />
        </label>
        <label>
          <span>{labels.type}</span>
          <select
            name="contentType"
            defaultValue={entry?.content_type ?? "journal"}
          >
            {[
              "homepage",
              "journal",
              "about",
              "faq",
              "delivery",
              "returns",
              "privacy",
              "cookie",
              "terms",
            ].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{labels.fallback}</span>
          <select
            name="fallbackPolicy"
            defaultValue={entry?.fallback_policy ?? "disclose"}
          >
            <option value="disclose">{labels.disclose}</option>
            <option value="strict">{labels.strict}</option>
          </select>
        </label>
        <label>
          <span>{labels.legalStatus}</span>
          <select
            name="legalStatus"
            defaultValue={entry?.legal_status ?? "not_applicable"}
          >
            <option value="not_applicable">{labels.notApplicable}</option>
            <option value="draft_unapproved">{labels.draftUnapproved}</option>
            <option value="approved">{labels.approved}</option>
          </select>
        </label>
        <div className="translation-editor-grid">
          {editorLocales.map((candidate) => {
            const translation = byLocale.get(candidate);
            return (
              <fieldset className="translation-editor" key={candidate}>
                <legend>{candidate.toUpperCase()}</legend>
                <label>
                  <span>{labels.slug}</span>
                  <input
                    name={`slug_${candidate}`}
                    defaultValue={
                      translation?.slug ??
                      `${entry?.entry_key ?? "new-page"}-${candidate}`
                    }
                    required
                  />
                </label>
                <label>
                  <span>{labels.titleLabel}</span>
                  <input
                    name={`title_${candidate}`}
                    defaultValue={translation?.title ?? ""}
                    required
                  />
                </label>
                <label>
                  <span>{labels.summary}</span>
                  <textarea
                    name={`summary_${candidate}`}
                    defaultValue={translation?.summary ?? ""}
                    maxLength={500}
                  />
                </label>
                <label>
                  <span>{labels.blocks}</span>
                  <textarea
                    className="code-textarea"
                    name={`blocks_${candidate}`}
                    defaultValue={
                      translation
                        ? JSON.stringify(translation.blocks, null, 2)
                        : emptyBlocks
                    }
                    rows={12}
                    required
                  />
                </label>
                <label>
                  <span>{labels.metaTitle}</span>
                  <input
                    name={`metaTitle_${candidate}`}
                    defaultValue={translation?.meta_title ?? ""}
                  />
                </label>
                <label>
                  <span>{labels.metaDescription}</span>
                  <textarea
                    name={`metaDescription_${candidate}`}
                    defaultValue={translation?.meta_description ?? ""}
                  />
                </label>
                <label>
                  <span>{labels.socialImage}</span>
                  <input
                    name={`socialImageUrl_${candidate}`}
                    type="url"
                    defaultValue={translation?.social_image_url ?? ""}
                  />
                </label>
                <label>
                  <span>{labels.review}</span>
                  <select
                    name={`reviewStatus_${candidate}`}
                    defaultValue={translation?.review_status ?? "draft"}
                  >
                    <option value="draft">{labels.draft}</option>
                    <option value="reviewed">{labels.reviewed}</option>
                    <option value="approved">{labels.approved}</option>
                  </select>
                </label>
              </fieldset>
            );
          })}
        </div>
        <label>
          <span>{labels.reason}</span>
          <input name="reason" minLength={2} required />
        </label>
        <button className="button" type="submit" disabled={saving}>
          {saving ? labels.saving : labels.save}
        </button>
        <span role="status">
          {saveState?.ok ? labels.saved : saveState ? labels.failed : ""}
        </span>
      </form>
      {entry ? (
        <aside className="content-editor-controls">
          <form
            className="admin-panel settings-form-grid"
            action={transitionAction}
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="contentEntryId" value={entry.id} />
            <input type="hidden" name="expectedVersion" value={entry.version} />
            <h2>{labels.workflow}</h2>
            <p>
              {labels.current}: <strong>{entry.status}</strong> · v
              {entry.version}
            </p>
            <label>
              <span>{labels.target}</span>
              <select name="targetStatus" defaultValue="published">
                <option value="draft">{labels.draft}</option>
                <option value="scheduled">{labels.scheduled}</option>
                <option value="published">{labels.published}</option>
                <option value="unpublished">{labels.unpublished}</option>
                <option value="archived">{labels.archived}</option>
                <option value="restore">{labels.restore}</option>
              </select>
            </label>
            <label>
              <span>{labels.publishAt}</span>
              <input
                name="publishAt"
                type="datetime-local"
                defaultValue={localInputDate(entry.publish_at)}
              />
            </label>
            <label>
              <span>{labels.unpublishAt}</span>
              <input
                name="unpublishAt"
                type="datetime-local"
                defaultValue={localInputDate(entry.unpublish_at)}
              />
            </label>
            <label>
              <span>{labels.reason}</span>
              <input name="reason" minLength={2} required />
            </label>
            <button className="button" type="submit" disabled={transitioning}>
              {labels.apply}
            </button>
            <span role="status">
              {transitionState?.ok
                ? labels.saved
                : transitionState
                  ? labels.failed
                  : ""}
            </span>
          </form>
          <form className="admin-panel" action={previewAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="contentEntryId" value={entry.id} />
            <h2>{labels.preview}</h2>
            <button className="button" type="submit" disabled={previewing}>
              {labels.createPreview}
            </button>
            {previewState?.ok && previewState.data.previewPath ? (
              <p>
                <a
                  href={previewState.data.previewPath}
                  target="_blank"
                  rel="noreferrer"
                >
                  {labels.openPreview}
                </a>
              </p>
            ) : null}
          </form>
        </aside>
      ) : null}
    </div>
  );
}
