"use client";

import { useActionState } from "react";

import {
  saveProductReviewAction,
  type ReviewActionState,
} from "@/features/ingestion/review.actions";
import type { AppLocale } from "@/i18n/routing";

type TranslationValue = {
  locale: AppLocale;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  careText: string;
  seoTitle: string;
  seoDescription: string;
};

export function ProductReviewForm({
  locale,
  batchId,
  product,
  translations,
  labels,
}: {
  locale: AppLocale;
  batchId: string;
  product: {
    version: number;
    widthMm: number | null;
    lengthMm: number | null;
    shape: string | null;
    materials: string[];
    construction: string | null;
    colors: string[];
    styles: string[];
    condition: string | null;
    careCode: string | null;
    deliveryClass: string | null;
    category: string | null;
    origin: string | null;
    originVerified: boolean;
    price: string;
    quantity: number;
  };
  translations: TranslationValue[];
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<ReviewActionState, FormData>(
    saveProductReviewAction,
    undefined,
  );
  return (
    <form className="product-review-form" action={action}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="batchId" value={batchId} />
      <input type="hidden" name="productVersion" value={product.version} />
      <fieldset>
        <legend>{labels.facts}</legend>
        <div className="review-field-grid">
          <label>
            <span>{labels.width}</span>
            <input
              name="widthMm"
              type="number"
              min={1}
              max={100000}
              defaultValue={product.widthMm ?? ""}
              required
            />
          </label>
          <label>
            <span>{labels.length}</span>
            <input
              name="lengthMm"
              type="number"
              min={1}
              max={100000}
              defaultValue={product.lengthMm ?? ""}
              required
            />
          </label>
          <label>
            <span>{labels.shape}</span>
            <input
              name="shape"
              defaultValue={product.shape ?? "rectangle"}
              required
              maxLength={60}
            />
          </label>
          <label>
            <span>{labels.materials}</span>
            <input
              name="materials"
              defaultValue={product.materials.join(", ")}
              required
              maxLength={500}
            />
          </label>
          <label>
            <span>{labels.construction}</span>
            <input
              name="construction"
              defaultValue={product.construction ?? ""}
              required
              maxLength={120}
            />
          </label>
          <label>
            <span>{labels.colors}</span>
            <input
              name="colors"
              defaultValue={product.colors.join(", ")}
              required
              maxLength={500}
            />
          </label>
          <label>
            <span>{labels.styles}</span>
            <input
              name="styles"
              defaultValue={product.styles.join(", ")}
              maxLength={500}
            />
          </label>
          <label>
            <span>{labels.condition}</span>
            <input
              name="condition"
              defaultValue={product.condition ?? ""}
              required
              maxLength={120}
            />
          </label>
          <label>
            <span>{labels.careCode}</span>
            <input
              name="careCode"
              defaultValue={product.careCode ?? "professional-clean"}
              required
              maxLength={80}
            />
          </label>
          <label>
            <span>{labels.deliveryClass}</span>
            <input
              name="deliveryClass"
              defaultValue={product.deliveryClass ?? "parcel"}
              required
              maxLength={80}
            />
          </label>
          <label>
            <span>{labels.category}</span>
            <input
              name="category"
              defaultValue={product.category ?? "carpet"}
              required
              maxLength={80}
            />
          </label>
          <label>
            <span>{labels.origin}</span>
            <input
              name="origin"
              defaultValue={product.origin ?? ""}
              maxLength={120}
            />
          </label>
          <label className="checkbox-field">
            <input
              name="originVerified"
              type="checkbox"
              value="true"
              defaultChecked={product.originVerified}
            />
            <span>{labels.originVerified}</span>
          </label>
          <label>
            <span>{labels.price}</span>
            <input
              name="price"
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              defaultValue={product.price}
              required
            />
          </label>
          <label>
            <span>{labels.quantity}</span>
            <input
              name="onHandQuantity"
              type="number"
              min={0}
              max={1000000}
              defaultValue={product.quantity}
              required
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>{labels.translations}</legend>
        <p>{labels.translationHelp}</p>
        {translations.map((translation) => (
          <details
            className="translation-editor"
            key={translation.locale}
            open={translation.locale === locale}
          >
            <summary>{labels[`language.${translation.locale}`]}</summary>
            <div className="review-field-grid">
              <label>
                <span>{labels.slug}</span>
                <input
                  name={`${translation.locale}.slug`}
                  defaultValue={translation.slug}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  maxLength={160}
                  required
                />
              </label>
              <label>
                <span>{labels.name}</span>
                <input
                  name={`${translation.locale}.name`}
                  defaultValue={translation.name}
                  maxLength={180}
                  required
                />
              </label>
              <label className="field-wide">
                <span>{labels.shortDescription}</span>
                <textarea
                  name={`${translation.locale}.shortDescription`}
                  defaultValue={translation.shortDescription}
                  maxLength={500}
                  required
                />
              </label>
              <label className="field-wide">
                <span>{labels.longDescription}</span>
                <textarea
                  name={`${translation.locale}.longDescription`}
                  defaultValue={translation.longDescription}
                  maxLength={10000}
                  rows={6}
                  required
                />
              </label>
              <label className="field-wide">
                <span>{labels.careText}</span>
                <textarea
                  name={`${translation.locale}.careText`}
                  defaultValue={translation.careText}
                  maxLength={3000}
                />
              </label>
              <label>
                <span>{labels.seoTitle}</span>
                <input
                  name={`${translation.locale}.seoTitle`}
                  defaultValue={translation.seoTitle}
                  maxLength={70}
                />
              </label>
              <label>
                <span>{labels.seoDescription}</span>
                <input
                  name={`${translation.locale}.seoDescription`}
                  defaultValue={translation.seoDescription}
                  maxLength={180}
                />
              </label>
            </div>
          </details>
        ))}
      </fieldset>
      <button className="button" type="submit" disabled={pending}>
        {labels.save}
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
  );
}
