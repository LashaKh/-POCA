import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { RevisionDiff } from "@/components/admin/catalog/revision-diff";
import { getAdminProductDetail } from "@/features/catalog/admin-queries";
import { getCatalogAdminLabels } from "@/features/catalog/admin-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function CatalogProductHistoryPage({
  params,
}: {
  params: Promise<{ locale: string; productId: string }>;
}) {
  const { locale, productId } = await params;
  if (!isAppLocale(locale)) return null;
  setRequestLocale(locale);
  const [t, detail] = await Promise.all([
    getTranslations({ locale, namespace: "admin.catalog" }),
    getAdminProductDetail(productId),
  ]);
  if (!detail) notFound();
  const labels = getCatalogAdminLabels(locale);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <Link href={`/admin/products/${productId}/edit`} locale={locale}>
          {labels.backEditor}
        </Link>
        <p className="eyebrow">{detail.product.sku}</p>
        <h1>{t("historyTitle")}</h1>
        <p>{t("historyIntro")}</p>
      </header>
      <RevisionDiff
        labels={labels}
        revisions={detail.revisions.map((revision) => ({
          id: revision.id,
          version: revision.entity_version,
          kind: revision.revision_kind,
          changedFields: revision.changed_fields,
          note: revision.note ?? labels.defaultChangeNote,
          createdAt: revision.created_at,
          snapshot: revision.snapshot,
        }))}
      />
    </main>
  );
}
