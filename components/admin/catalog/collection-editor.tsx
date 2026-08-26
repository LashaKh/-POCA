"use client";

import { useState } from "react";

import {
  reorderCollectionFormAction,
  saveCollectionFormAction,
} from "@/features/collections/admin-actions";
import type { AppLocale } from "@/i18n/routing";
import { formatBusinessDateTimeInput } from "@/lib/datetime/format";

type CollectionTranslation = {
  locale: AppLocale;
  slug: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "reviewed" | "published";
};

type CollectionMember = {
  productId: string;
  sku: string;
  name: string;
  featured: boolean;
};

export function CollectionEditor({
  locale,
  collection,
  labels,
}: {
  locale: AppLocale;
  collection: {
    id: string;
    version: number;
    code: string;
    status: "draft" | "scheduled" | "published" | "archived";
    orderStrategy: string;
    scheduledAt: string | null;
    translations: CollectionTranslation[];
    members: CollectionMember[];
  };
  labels: Record<string, string>;
}) {
  const [members, setMembers] = useState(collection.members);
  const [featuredId, setFeaturedId] = useState(
    collection.members.find((member) => member.featured)?.productId ?? "",
  );

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= members.length) return;
    setMembers((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="collection-editor-grid">
      <form
        className="admin-panel product-review-form"
        action={saveCollectionFormAction}
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="collectionId" value={collection.id} />
        <input
          type="hidden"
          name="expectedVersion"
          value={collection.version}
        />
        <h2>{labels.collectionDetails}</h2>
        <div className="review-field-grid">
          <label>
            <span>{labels.code}</span>
            <input
              name="code"
              defaultValue={collection.code}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              maxLength={120}
              required
            />
          </label>
          <label>
            <span>{labels.status}</span>
            <select name="status" defaultValue={collection.status}>
              <option value="draft">draft</option>
              <option value="scheduled">scheduled</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label>
            <span>{labels.orderStrategy}</span>
            <select
              name="orderStrategy"
              defaultValue={collection.orderStrategy}
            >
              <option value="manual">manual</option>
              <option value="newest">newest</option>
              <option value="price_asc">price ascending</option>
              <option value="price_desc">price descending</option>
            </select>
          </label>
          <label>
            <span>{labels.scheduledAt}</span>
            <input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={formatBusinessDateTimeInput(collection.scheduledAt)}
            />
          </label>
        </div>
        {collection.translations.map((translation) => (
          <details
            className="translation-editor"
            key={translation.locale}
            open={translation.locale === locale}
          >
            <summary>
              {translation.locale.toUpperCase()} · {translation.name}
            </summary>
            <div className="review-field-grid">
              <label>
                <span>{labels.slug}</span>
                <input
                  name={`${translation.locale}.slug`}
                  defaultValue={translation.slug}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
              </label>
              <label>
                <span>{labels.name}</span>
                <input
                  name={`${translation.locale}.name`}
                  defaultValue={translation.name}
                  required
                />
              </label>
              <label className="field-wide">
                <span>{labels.description}</span>
                <textarea
                  name={`${translation.locale}.description`}
                  defaultValue={translation.description}
                  rows={4}
                />
              </label>
              <label>
                <span>{labels.seoTitle}</span>
                <input
                  name={`${translation.locale}.seoTitle`}
                  defaultValue={translation.seoTitle}
                />
              </label>
              <label>
                <span>{labels.seoDescription}</span>
                <input
                  name={`${translation.locale}.seoDescription`}
                  defaultValue={translation.seoDescription}
                />
              </label>
              <label>
                <span>{labels.translationStatus}</span>
                <select
                  name={`${translation.locale}.status`}
                  defaultValue={translation.status}
                >
                  <option value="draft">draft</option>
                  <option value="reviewed">reviewed</option>
                  <option value="published">published</option>
                </select>
              </label>
            </div>
          </details>
        ))}
        <label>
          <span>{labels.changeNote}</span>
          <input
            name="note"
            minLength={2}
            maxLength={500}
            required
            defaultValue={labels.collectionChangeNote}
          />
        </label>
        <button className="button" type="submit">
          {labels.saveCollection}
        </button>
      </form>
      <section className="admin-panel" aria-labelledby="merchandising-heading">
        <h2 id="merchandising-heading">{labels.merchandising}</h2>
        <p className="muted-copy">{labels.merchandisingHelp}</p>
        {members.length ? (
          <form action={reorderCollectionFormAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="collectionId" value={collection.id} />
            <input
              type="hidden"
              name="expectedVersion"
              value={collection.version}
            />
            <input
              type="hidden"
              name="productIds"
              value={members.map((member) => member.productId).join(",")}
            />
            <ol className="merchandising-list">
              {members.map((member, index) => (
                <li key={member.productId}>
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.sku}</small>
                  </span>
                  <label>
                    <input
                      type="radio"
                      name="featuredProductId"
                      value={member.productId}
                      checked={featuredId === member.productId}
                      onChange={() => setFeaturedId(member.productId)}
                    />
                    {labels.featured}
                  </label>
                  <div className="button-row">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={labels.moveUp.replace("{name}", member.name)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === members.length - 1}
                      aria-label={labels.moveDown.replace(
                        "{name}",
                        member.name,
                      )}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <button className="button" type="submit">
              {labels.saveOrder}
            </button>
          </form>
        ) : (
          <p>{labels.noCollectionProducts}</p>
        )}
      </section>
    </div>
  );
}
