import { RedirectEditor } from "@/components/admin/content/menu-editor";
import { getContentAdminLabels } from "@/features/content/admin-copy";
import { getContentAdministration } from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function ContentRedirectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, administration] = await Promise.all([
    getContentAdminLabels(locale),
    getContentAdministration(),
  ]);
  return (
    <main className="admin-main admin-wide" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.redirects}</h1>
      </header>
      <div className="admin-card-grid">
        <RedirectEditor locale={locale} labels={labels} />
        {administration.redirects.map((redirect) => (
          <RedirectEditor
            key={redirect.id}
            locale={locale}
            redirect={redirect}
            labels={labels}
          />
        ))}
      </div>
    </main>
  );
}
