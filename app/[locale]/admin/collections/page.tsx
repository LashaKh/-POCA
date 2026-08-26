import { getTranslations, setRequestLocale } from "next-intl/server";

import { saveCollectionFormAction } from "@/features/collections/admin-actions";
import { getCatalogCollections } from "@/features/catalog/admin-queries";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale, locales } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function CatalogCollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, collections] = await Promise.all([
    getTranslations({ locale, namespace: "admin.catalog" }),
    getCatalogCollections(),
  ]);
  const labels = getCatalogAdminLabels(locale);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("collectionsTitle")}</h1>
        <p>{t("collectionsIntro")}</p>
      </header>
      <section className="admin-panel" aria-labelledby="new-collection-heading">
        <h2 id="new-collection-heading">{labels.newCollection}</h2>
        <form className="product-review-form" action={saveCollectionFormAction}>
          <input type="hidden" name="locale" value={locale} />
          <div className="review-field-grid">
            <label>
              <span>{labels.code}</span>
              <input name="code" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            </label>
            <label>
              <span>{labels.status}</span>
              <select name="status" defaultValue="draft">
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="published">published</option>
              </select>
            </label>
            <label>
              <span>{labels.orderStrategy}</span>
              <select name="orderStrategy" defaultValue="manual">
                <option value="manual">manual</option>
                <option value="newest">newest</option>
                <option value="price_asc">price ascending</option>
                <option value="price_desc">price descending</option>
              </select>
            </label>
            <label>
              <span>{labels.scheduledAt}</span>
              <input name="scheduledAt" type="datetime-local" />
            </label>
          </div>
          {locales.map((translationLocale) => (
            <fieldset key={translationLocale}>
              <legend>{translationLocale.toUpperCase()}</legend>
              <div className="review-field-grid">
                <label>
                  <span>{labels.name}</span>
                  <input name={`${translationLocale}.name`} required />
                </label>
                <label>
                  <span>{labels.slug}</span>
                  <input
                    name={`${translationLocale}.slug`}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    required
                  />
                </label>
                <label className="field-wide">
                  <span>{labels.description}</span>
                  <textarea
                    name={`${translationLocale}.description`}
                    rows={3}
                  />
                </label>
                <input
                  type="hidden"
                  name={`${translationLocale}.seoTitle`}
                  value=""
                />
                <input
                  type="hidden"
                  name={`${translationLocale}.seoDescription`}
                  value=""
                />
                <input
                  type="hidden"
                  name={`${translationLocale}.status`}
                  value="draft"
                />
              </div>
            </fieldset>
          ))}
          <label>
            <span>{labels.changeNote}</span>
            <input
              name="note"
              defaultValue={labels.createCollectionNote}
              required
            />
          </label>
          <button className="button" type="submit">
            {labels.createCollection}
          </button>
        </form>
      </section>
      <section className="admin-panel">
        <div className="batch-list">
          {collections.map((collection) => {
            const translation =
              collection.collection_translations.find(
                (item) => item.locale === locale,
              ) ??
              collection.collection_translations.find(
                (item) => item.locale === "en",
              );
            const count = collection.collection_products[0]?.count ?? 0;
            return (
              <article className="batch-row" key={collection.id}>
                <div>
                  <span className={`status-chip status-${collection.status}`}>
                    {collection.status}
                  </span>
                  <h2>{translation?.name ?? collection.code}</h2>
                  <p>
                    {labels.collectionSummary
                      .replace("{code}", collection.code)
                      .replace("{count}", String(count))}
                  </p>
                </div>
                <Link
                  className="button button-secondary"
                  href={`/admin/collections/${collection.id}`}
                  locale={locale}
                >
                  {labels.editCollection}
                </Link>
              </article>
            );
          })}
          {!collections.length ? <p>{labels.noCollections}</p> : null}
        </div>
      </section>
    </main>
  );
}
