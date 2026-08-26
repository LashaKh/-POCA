"use client";

import { useMemo, useState } from "react";

import { locales, type AppLocale } from "@/i18n/routing";

import type { CatalogTranslationValue } from "./product-form/types";

function languageLabelKey(locale: AppLocale) {
  return `language${locale[0].toUpperCase()}${locale.slice(1)}`;
}

export function TranslationWorkspace({
  initialTranslations,
  labels,
}: {
  initialTranslations: CatalogTranslationValue[];
  labels: Record<string, string>;
}) {
  const [translations, setTranslations] = useState(initialTranslations);
  const [sourceLocale, setSourceLocale] = useState<AppLocale>("en");
  const completeCount = translations.filter(
    (translation) => translation.name.trim() && translation.slug.trim(),
  ).length;
  const copiedNames = useMemo(() => {
    const groups = new Map<string, AppLocale[]>();
    for (const translation of translations) {
      const name = translation.name
        .trim()
        .toLocaleLowerCase(translation.locale);
      if (!name) continue;
      groups.set(name, [...(groups.get(name) ?? []), translation.locale]);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  }, [translations]);
  const source = translations.find(
    (translation) => translation.locale === sourceLocale,
  );

  function update(
    locale: AppLocale,
    field: keyof CatalogTranslationValue,
    value: string,
  ) {
    setTranslations((current) =>
      current.map((translation) =>
        translation.locale === locale
          ? { ...translation, [field]: value }
          : translation,
      ),
    );
  }

  return (
    <fieldset className="translation-workspace">
      <legend>{labels.translations}</legend>
      <div className="translation-summary" aria-live="polite">
        <strong>
          {labels.completeness.replace("{count}", String(completeCount))}
        </strong>
        <label>
          <span>{labels.compareSource}</span>
          <select
            value={sourceLocale}
            onChange={(event) =>
              setSourceLocale(event.target.value as AppLocale)
            }
          >
            {locales.map((locale) => (
              <option value={locale} key={locale}>
                {labels[languageLabelKey(locale)]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {copiedNames.length ? (
        <p className="warning-message" role="status">
          {labels.copiedWarning}{" "}
          {copiedNames.map((group) => group.join(" / ")).join(", ")}
        </p>
      ) : null}
      {translations.map((translation) => (
        <details
          className="translation-editor"
          key={translation.locale}
          open={translation.locale === "en"}
        >
          <summary>
            {labels[languageLabelKey(translation.locale)]} ·{" "}
            {translation.name.trim() && translation.slug.trim()
              ? labels.complete
              : labels.missing}
          </summary>
          {translation.locale !== sourceLocale && source?.name ? (
            <p className="source-comparison">
              <strong>{labels.source}:</strong> {source.name}
            </p>
          ) : null}
          <div className="review-field-grid">
            <label>
              <span>{labels.slug}</span>
              <input
                name={`${translation.locale}.slug`}
                value={translation.slug}
                onChange={(event) =>
                  update(translation.locale, "slug", event.target.value)
                }
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                maxLength={160}
                required
              />
            </label>
            <label>
              <span>{labels.name}</span>
              <input
                name={`${translation.locale}.name`}
                value={translation.name}
                onChange={(event) =>
                  update(translation.locale, "name", event.target.value)
                }
                maxLength={180}
                required
              />
            </label>
            <label className="field-wide">
              <span>{labels.shortDescription}</span>
              <textarea
                name={`${translation.locale}.shortDescription`}
                value={translation.shortDescription}
                onChange={(event) =>
                  update(
                    translation.locale,
                    "shortDescription",
                    event.target.value,
                  )
                }
                maxLength={500}
              />
            </label>
            <label className="field-wide">
              <span>{labels.longDescription}</span>
              <textarea
                name={`${translation.locale}.longDescription`}
                value={translation.longDescription}
                onChange={(event) =>
                  update(
                    translation.locale,
                    "longDescription",
                    event.target.value,
                  )
                }
                maxLength={10000}
                rows={6}
              />
            </label>
            <label className="field-wide">
              <span>{labels.careText}</span>
              <textarea
                name={`${translation.locale}.careText`}
                value={translation.careText}
                onChange={(event) =>
                  update(translation.locale, "careText", event.target.value)
                }
                maxLength={3000}
              />
            </label>
            <label className="field-wide">
              <span>{labels.searchText}</span>
              <input
                name={`${translation.locale}.searchText`}
                value={translation.searchText}
                onChange={(event) =>
                  update(translation.locale, "searchText", event.target.value)
                }
                maxLength={12000}
              />
            </label>
            <label>
              <span>{labels.seoTitle}</span>
              <input
                name={`${translation.locale}.seoTitle`}
                value={translation.seoTitle}
                onChange={(event) =>
                  update(translation.locale, "seoTitle", event.target.value)
                }
                maxLength={70}
              />
            </label>
            <label>
              <span>{labels.seoDescription}</span>
              <input
                name={`${translation.locale}.seoDescription`}
                value={translation.seoDescription}
                onChange={(event) =>
                  update(
                    translation.locale,
                    "seoDescription",
                    event.target.value,
                  )
                }
                maxLength={180}
              />
            </label>
            <label>
              <span>{labels.translationStatus}</span>
              <select
                name={`${translation.locale}.status`}
                value={translation.status}
                onChange={(event) =>
                  update(translation.locale, "status", event.target.value)
                }
              >
                <option value="draft">draft</option>
                <option value="reviewed">reviewed</option>
                <option value="published">published</option>
              </select>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                name={`${translation.locale}.altTextReady`}
                value="true"
                defaultChecked={translation.altTextReady}
              />
              <span>{labels.altTextReady}</span>
            </label>
          </div>
        </details>
      ))}
    </fieldset>
  );
}
