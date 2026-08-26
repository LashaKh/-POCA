"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  saveCatalogProductAction,
  type CatalogActionState,
} from "@/features/catalog/admin-actions";
import type { AppLocale } from "@/i18n/routing";

import { TranslationWorkspace } from "../translation-workspace";
import type { CatalogProductFormValue } from "./types";

export function CatalogProductForm({
  locale,
  initial,
  labels,
}: {
  locale: AppLocale;
  initial: CatalogProductFormValue;
  labels: Record<string, string>;
}) {
  const [state, action, pending] = useActionState<CatalogActionState, FormData>(
    saveCatalogProductAction,
    undefined,
  );
  const versionRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const isEdit = Boolean(initial.id);

  useEffect(() => {
    if (state?.ok && state.data.version && versionRef.current) {
      versionRef.current.value = String(state.data.version);
    }
    if (state?.ok) dirtyRef.current = false;
  }, [state]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(
    () => () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    },
    [],
  );

  function scheduleAutosave() {
    dirtyRef.current = true;
    if (!isEdit || pending) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(
      () => formRef.current?.requestSubmit(),
      1800,
    );
  }

  return (
    <form
      ref={formRef}
      className="product-review-form catalog-product-form"
      action={action}
      onChange={scheduleAutosave}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="productId" value={initial.id ?? ""} />
      <input
        ref={versionRef}
        type="hidden"
        name="expectedVersion"
        defaultValue={initial.version ?? ""}
      />
      <fieldset>
        <legend>{labels.identity}</legend>
        <div className="review-field-grid">
          <label>
            <span>{labels.sku}</span>
            <input
              name="sku"
              defaultValue={initial.sku}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            <span>{labels.category}</span>
            <input
              name="category"
              defaultValue={initial.category}
              maxLength={80}
            />
          </label>
          <label>
            <span>{labels.shape}</span>
            <input name="shape" defaultValue={initial.shape} maxLength={60} />
          </label>
          <label>
            <span>{labels.condition}</span>
            <input
              name="condition"
              defaultValue={initial.condition}
              maxLength={120}
            />
          </label>
          <label>
            <span>{labels.width}</span>
            <input
              name="widthMm"
              type="number"
              min={1}
              max={100000}
              defaultValue={initial.widthMm ?? ""}
            />
          </label>
          <label>
            <span>{labels.length}</span>
            <input
              name="lengthMm"
              type="number"
              min={1}
              max={100000}
              defaultValue={initial.lengthMm ?? ""}
            />
          </label>
          <label>
            <span>{labels.diameter}</span>
            <input
              name="diameterMm"
              type="number"
              min={1}
              max={100000}
              defaultValue={initial.diameterMm ?? ""}
            />
          </label>
          <label>
            <span>{labels.construction}</span>
            <input
              name="construction"
              defaultValue={initial.construction}
              maxLength={120}
            />
          </label>
          <label className="field-wide">
            <span>{labels.materials}</span>
            <input
              name="materials"
              defaultValue={initial.materials.join(", ")}
              maxLength={1200}
            />
          </label>
          <label className="field-wide">
            <span>{labels.colors}</span>
            <input
              name="colors"
              defaultValue={initial.colors.join(", ")}
              maxLength={1200}
            />
          </label>
          <label className="field-wide">
            <span>{labels.styles}</span>
            <input
              name="styles"
              defaultValue={initial.styles.join(", ")}
              maxLength={1200}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>{labels.commerce}</legend>
        <div className="review-field-grid">
          <label>
            <span>{labels.priceGel}</span>
            <input
              name="gelPrice"
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              defaultValue={initial.gelPrice}
              required
            />
          </label>
          <label>
            <span>{labels.deliveryClass}</span>
            <input
              name="deliveryClass"
              defaultValue={initial.deliveryClass}
              maxLength={80}
            />
          </label>
          {isEdit ? (
            <>
              <input
                type="hidden"
                name="stockModel"
                value={initial.stockModel}
              />
              <input
                type="hidden"
                name="onHandQuantity"
                value={initial.onHandQuantity}
              />
              <p className="field-wide muted-copy">
                {labels.inventorySeparate}
              </p>
            </>
          ) : (
            <>
              <label>
                <span>{labels.stockModel}</span>
                <select name="stockModel" defaultValue={initial.stockModel}>
                  <option value="unique">{labels.unique}</option>
                  <option value="stocked">{labels.stocked}</option>
                </select>
              </label>
              <label>
                <span>{labels.onHand}</span>
                <input
                  name="onHandQuantity"
                  type="number"
                  min={0}
                  max={1000000}
                  defaultValue={initial.onHandQuantity}
                  required
                />
              </label>
            </>
          )}
          <label>
            <span>{labels.careCode}</span>
            <input
              name="careCode"
              defaultValue={initial.careCode}
              maxLength={80}
            />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>{labels.provenance}</legend>
        <div className="review-field-grid">
          <label>
            <span>{labels.origin}</span>
            <input
              name="origin"
              defaultValue={initial.origin}
              maxLength={120}
            />
          </label>
          <label className="checkbox-field">
            <input
              name="originVerified"
              type="checkbox"
              value="true"
              defaultChecked={initial.originVerified}
            />
            <span>{labels.originVerified}</span>
          </label>
          <label>
            <span>{labels.ageMinimum}</span>
            <input
              name="ageMinYear"
              type="number"
              min={1000}
              max={2200}
              defaultValue={initial.ageMinYear ?? ""}
            />
          </label>
          <label>
            <span>{labels.ageMaximum}</span>
            <input
              name="ageMaxYear"
              type="number"
              min={1000}
              max={2200}
              defaultValue={initial.ageMaxYear ?? ""}
            />
          </label>
          <label className="checkbox-field field-wide">
            <input
              name="ageVerified"
              type="checkbox"
              value="true"
              defaultChecked={initial.ageVerified}
            />
            <span>{labels.ageVerified}</span>
          </label>
          <label>
            <span>{labels.pile}</span>
            <input
              name="pile"
              defaultValue={initial.pile ?? ""}
              maxLength={120}
            />
          </label>
          <label className="checkbox-field">
            <input
              name="pileVerified"
              type="checkbox"
              value="true"
              defaultChecked={initial.pileVerified}
            />
            <span>{labels.pileVerified}</span>
          </label>
          <label>
            <span>{labels.handmade}</span>
            <select
              name="handmade"
              defaultValue={
                initial.handmade === true
                  ? "true"
                  : initial.handmade === false
                    ? "false"
                    : ""
              }
            >
              <option value="">{labels.unknown}</option>
              <option value="true">{labels.yes}</option>
              <option value="false">{labels.no}</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input
              name="handmadeVerified"
              type="checkbox"
              value="true"
              defaultChecked={initial.handmadeVerified}
            />
            <span>{labels.handmadeVerified}</span>
          </label>
          <label className="field-wide">
            <span>{labels.provenanceSummary}</span>
            <textarea
              name="provenanceSummary"
              defaultValue={initial.provenanceSummary ?? ""}
              maxLength={2000}
              rows={4}
            />
          </label>
          <label className="checkbox-field field-wide">
            <input
              name="provenanceVerified"
              type="checkbox"
              value="true"
              defaultChecked={initial.provenanceVerified}
            />
            <span>{labels.provenanceVerified}</span>
          </label>
        </div>
      </fieldset>
      <TranslationWorkspace
        initialTranslations={initial.translations}
        labels={labels}
      />
      <fieldset>
        <legend>{labels.changeControl}</legend>
        <label className="field-wide">
          <span>{labels.changeNote}</span>
          <input
            name="changeNote"
            minLength={2}
            maxLength={500}
            required
            defaultValue={labels.defaultChangeNote}
          />
        </label>
        {isEdit ? <p className="muted-copy">{labels.autosaveHelp}</p> : null}
      </fieldset>
      <div className="button-row form-status-row">
        <button className="button" type="submit" disabled={pending}>
          {pending ? labels.saving : labels.save}
        </button>
        {state ? (
          <p
            className={state.ok ? "success-message" : "field-error"}
            role="status"
          >
            {state.ok
              ? labels.saved
              : state.error.code === "VERSION_CONFLICT"
                ? labels.versionConflict
                : labels.failed}
          </p>
        ) : null}
      </div>
      {state?.ok && !isEdit ? (
        <a
          className="text-link"
          href={`/${locale}/admin/products/${state.data.id}/edit`}
        >
          {labels.continueEditing}
        </a>
      ) : null}
    </form>
  );
}
