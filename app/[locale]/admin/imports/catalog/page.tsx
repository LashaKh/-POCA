import { getTranslations, setRequestLocale } from "next-intl/server";

import { ImportWorkspace } from "@/components/admin/catalog/import-workspace";
import { getCatalogImports } from "@/features/catalog/admin-queries";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function CatalogImportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, rawBatches] = await Promise.all([
    getTranslations({ locale, namespace: "admin.catalog" }),
    getCatalogImports(),
  ]);
  const labels = getCatalogAdminLabels(locale);
  const batches = rawBatches.map((batch) => ({
    id: batch.id,
    status: batch.status,
    originalFilename: batch.original_filename,
    rowCount: batch.row_count,
    validCount: batch.valid_row_count,
    invalidCount: batch.invalid_row_count,
    appliedCount: batch.applied_row_count,
    errorReportPath: batch.error_report_path,
    createdAt: batch.created_at,
    rows: batch.catalog_import_rows.map((row) => ({
      rowNumber: row.row_number,
      status: row.status,
      errors: row.validation_errors,
      errorCode: row.safe_error_code,
    })),
  }));
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href="/admin/products" locale={locale}>
          {labels.backProducts}
        </Link>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t("importsTitle")}</h1>
        <p>{t("importsIntro")}</p>
      </header>
      <ImportWorkspace locale={locale} batches={batches} labels={labels} />
    </main>
  );
}
