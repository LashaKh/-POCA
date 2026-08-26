import {
  applyCatalogImportFormAction,
  cancelCatalogImportFormAction,
  stageCatalogImportFormAction,
} from "@/features/catalog/admin-actions";
import type { AppLocale } from "@/i18n/routing";

type ImportBatch = {
  id: string;
  status: string;
  originalFilename: string;
  rowCount: number;
  validCount: number;
  invalidCount: number;
  appliedCount: number;
  errorReportPath: string | null;
  createdAt: string;
  rows: Array<{
    rowNumber: number;
    status: string;
    errors: unknown;
    errorCode: string | null;
  }>;
};

function errorCount(errors: unknown) {
  return Array.isArray(errors) ? errors.length : 0;
}

export function ImportWorkspace({
  locale,
  batches,
  labels,
}: {
  locale: AppLocale;
  batches: ImportBatch[];
  labels: Record<string, string>;
}) {
  return (
    <>
      <section
        className="admin-panel import-dropzone"
        aria-labelledby="catalog-import-upload"
      >
        <p className="eyebrow">{labels.dryRun}</p>
        <h2 id="catalog-import-upload">{labels.uploadCatalogCsv}</h2>
        <p>{labels.importHelp}</p>
        <p>
          <a href="/catalog-import-template.csv" download>
            {labels.downloadTemplate}
          </a>
        </p>
        <form className="operation-form" action={stageCatalogImportFormAction}>
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>{labels.csvFile}</span>
            <input
              name="file"
              type="file"
              accept=".csv,text/csv,text/plain"
              required
            />
          </label>
          <button className="button" type="submit">
            {labels.validateUpload}
          </button>
        </form>
        <p className="muted-copy">{labels.importPrivacy}</p>
      </section>
      <section className="admin-panel" aria-labelledby="import-batches-heading">
        <h2 id="import-batches-heading">{labels.importBatches}</h2>
        <div className="batch-list">
          {batches.map((batch) => (
            <article className="import-batch" key={batch.id}>
              <div className="section-heading">
                <div>
                  <span className={`status-chip status-${batch.status}`}>
                    {batch.status}
                  </span>
                  <h3>{batch.originalFilename}</h3>
                  <p>
                    {labels.importSummary
                      .replace("{rows}", String(batch.rowCount))
                      .replace("{valid}", String(batch.validCount))
                      .replace("{invalid}", String(batch.invalidCount))
                      .replace("{applied}", String(batch.appliedCount))}
                  </p>
                </div>
                <div className="button-row">
                  {batch.errorReportPath ? (
                    <a
                      href={`/${locale}/admin/imports/catalog/${batch.id}/errors`}
                    >
                      {labels.downloadErrors}
                    </a>
                  ) : null}
                  {batch.status === "ready" && batch.validCount > 0 ? (
                    <form action={applyCatalogImportFormAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="batchId" value={batch.id} />
                      <button className="button" type="submit">
                        {labels.applyValidRows}
                      </button>
                    </form>
                  ) : null}
                  {batch.status === "ready" ? (
                    <form action={cancelCatalogImportFormAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="batchId" value={batch.id} />
                      <button className="text-button" type="submit">
                        {labels.cancelImport}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              {batch.rows.some(
                (row) => row.status !== "valid" && row.status !== "applied",
              ) ? (
                <details>
                  <summary>{labels.invalidRows}</summary>
                  <ul className="validation-row-list">
                    {batch.rows
                      .filter(
                        (row) =>
                          row.status !== "valid" && row.status !== "applied",
                      )
                      .map((row) => (
                        <li key={row.rowNumber}>
                          {labels.row.replace("{row}", String(row.rowNumber))} ·{" "}
                          {row.status} ·{" "}
                          {row.errorCode ??
                            labels.validationIssues.replace(
                              "{count}",
                              String(errorCount(row.errors)),
                            )}
                        </li>
                      ))}
                  </ul>
                </details>
              ) : null}
            </article>
          ))}
          {!batches.length ? <p>{labels.noImports}</p> : null}
        </div>
      </section>
    </>
  );
}
