import { getTranslations } from "next-intl/server";

import { createBatchAction } from "@/features/ingestion/actions";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function IngestionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "admin.ingestion" });
  const client = await createServerSupabaseClient();
  const { data: batches, error } = await client
    .from("ingestion_batches")
    .select(
      "id,title,status,registered_file_count,ready_file_count,failed_file_count,duplicate_file_count,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
      </header>
      <section className="admin-panel" aria-labelledby="new-batch-heading">
        <h2 id="new-batch-heading">{t("newBatch")}</h2>
        <form className="admin-form-row" action={createBatchAction}>
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>{t("batchTitle")}</span>
            <input
              name="title"
              required
              maxLength={160}
              placeholder={t("batchTitlePlaceholder")}
            />
          </label>
          <label>
            <span>{t("expectedFiles")}</span>
            <input
              name="expectedFileCount"
              type="number"
              min={1}
              max={250}
              defaultValue={12}
              required
            />
          </label>
          <button className="button" type="submit">
            {t("create")}
          </button>
        </form>
      </section>
      <section className="admin-panel" aria-live="polite">
        {batches.length === 0 ? (
          <p>{t("noBatches")}</p>
        ) : (
          <div className="batch-list">
            {batches.map((batch) => (
              <article className="batch-row" key={batch.id}>
                <div>
                  <span className={`status-chip status-${batch.status}`}>
                    {batch.status}
                  </span>
                  <h2>{batch.title}</h2>
                  <p>
                    {t("files", { count: batch.registered_file_count })} ·{" "}
                    {t("ready", { count: batch.ready_file_count })} ·{" "}
                    {t("failed", { count: batch.failed_file_count })} ·{" "}
                    {t("duplicate", { count: batch.duplicate_file_count })}
                  </p>
                </div>
                <Link
                  className="button"
                  href={`/admin/ingestion/${batch.id}`}
                  locale={locale}
                >
                  {t("open")}
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
