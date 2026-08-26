import { ContentEditor } from "@/components/admin/content/content-editor";
import { getContentAdminLabels } from "@/features/content/admin-copy";
import { getContentEntryAdministration } from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function ContentEditorPage({
  params,
}: {
  params: Promise<{ locale: string; contentId: string }>;
}) {
  const { locale, contentId } = await params;
  if (!isAppLocale(locale)) return null;
  const labels = await getContentAdminLabels(locale);
  const administration =
    contentId === "new"
      ? { entry: null, translations: [], revisions: [] }
      : await getContentEntryAdministration(contentId);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{administration.entry ? labels.edit : labels.create}</h1>
      </header>
      <ContentEditor
        locale={locale}
        entry={administration.entry}
        translations={administration.translations}
        labels={labels}
      />
      {administration.revisions.length ? (
        <section className="admin-panel">
          <h2>{labels.updated}</h2>
          <ol className="timeline">
            {administration.revisions.map((revision) => (
              <li key={revision.id}>
                <strong>
                  v{revision.version} · {revision.operation}
                </strong>
                <p>{revision.reason}</p>
                <time>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(revision.created_at))}
                </time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
