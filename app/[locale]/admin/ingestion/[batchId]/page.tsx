import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BatchUploader } from "@/components/admin/ingestion/batch-uploader";
import { DataTable } from "@/components/ui/data-table";
import {
  cancelBatchAction,
  retryIngestionFileAction,
} from "@/features/ingestion/actions";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function IngestionBatchPage({
  params,
}: {
  params: Promise<{ locale: string; batchId: string }>;
}) {
  const { locale, batchId } = await params;
  if (!isAppLocale(locale)) return null;
  const t = await getTranslations({ locale, namespace: "admin.ingestion" });
  const client = await createServerSupabaseClient();
  const [
    { data: batch, error: batchError },
    { data: files, error: filesError },
  ] = await Promise.all([
    client
      .from("ingestion_batches")
      .select("*")
      .eq("id", batchId)
      .maybeSingle(),
    client
      .from("ingestion_files")
      .select("id,original_filename,status,safe_error_summary,updated_at")
      .eq("batch_id", batchId)
      .order("created_at"),
  ]);
  if (batchError) throw batchError;
  if (filesError) throw filesError;
  if (!batch) notFound();
  const { data: failedJobs, error: failedJobsError } =
    files.length === 0
      ? { data: [], error: null }
      : await client
          .from("media_jobs")
          .select("subject_id")
          .eq("job_type", "product-renditions")
          .eq("status", "failed")
          .in(
            "subject_id",
            files.map((file) => file.id),
          );
  if (failedJobsError) throw failedJobsError;
  const retryableFileIds = new Set(
    failedJobs.flatMap((job) => (job.subject_id ? [job.subject_id] : [])),
  );
  const closed = batch.status === "cancelled" || batch.status === "published";

  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header batch-header">
        <div>
          <Link href="/admin/ingestion" locale={locale}>
            ← {t("back")}
          </Link>
          <p className="eyebrow">
            {t("eyebrow")} · {batch.status}
          </p>
          <h1>{batch.title}</h1>
          <p>{t("privateOriginals")}</p>
        </div>
        <div className="button-row">
          {batch.product_id ? (
            <Link
              className="button"
              href={`/admin/ingestion/${batch.id}/review`}
              locale={locale}
            >
              {t("review")}
            </Link>
          ) : null}
          {!closed ? (
            <form action={cancelBatchAction}>
              <input type="hidden" name="batchId" value={batch.id} />
              <input type="hidden" name="locale" value={locale} />
              <button className="text-button" type="submit">
                {t("cancelBatch")}
              </button>
            </form>
          ) : null}
        </div>
      </header>
      {!closed ? (
        <BatchUploader
          batchId={batch.id}
          labels={{
            heading: t("uploadHeading"),
            help: t("uploadHelp"),
            authorize: t("authorizing"),
            upload: t("upload"),
            cancel: t("cancelUploads"),
            rejected: t("uploadRejected"),
          }}
        />
      ) : null}
      <section className="admin-panel">
        {files.length === 0 ? (
          <p>{t("noFiles")}</p>
        ) : (
          <DataTable caption={t("files", { count: files.length })}>
            <thead>
              <tr>
                <th scope="col">{t("filename")}</th>
                <th scope="col">{t("status")}</th>
                <th scope="col">{t("progress")}</th>
                <th scope="col">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.id}>
                  <th scope="row">{file.original_filename}</th>
                  <td>
                    <span className={`status-chip status-${file.status}`}>
                      {file.status}
                    </span>
                  </td>
                  <td>{file.safe_error_summary ?? "—"}</td>
                  <td>
                    {retryableFileIds.has(file.id) ? (
                      <form action={retryIngestionFileAction}>
                        <input type="hidden" name="fileId" value={file.id} />
                        <input type="hidden" name="batchId" value={batch.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button className="text-button" type="submit">
                          {t("retryProcessing")}
                        </button>
                      </form>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </main>
  );
}
