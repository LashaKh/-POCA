import { getContentAdminLabels } from "@/features/content/admin-copy";
import { getContentAdministration } from "@/features/content/queries";
import { ContactChannelEditor } from "@/components/admin/content/menu-editor";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function ContentAdministrationPage({
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
        <h1>{labels.title}</h1>
        <p>{labels.intro}</p>
        <div className="admin-header-actions">
          <Link
            className="button-link"
            href="/admin/content/new"
            locale={locale}
          >
            {labels.create}
          </Link>
          <Link href="/admin/content/navigation" locale={locale}>
            {labels.navigation}
          </Link>
          <Link href="/admin/content/redirects" locale={locale}>
            {labels.redirects}
          </Link>
        </div>
      </header>
      <section className="admin-panel">
        <h2 id="content-entries-title">{labels.title}</h2>
        <div
          className="table-scroll"
          role="region"
          aria-labelledby="content-entries-title"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>{labels.key}</th>
                <th>{labels.type}</th>
                <th>{labels.status}</th>
                <th>{labels.translations}</th>
                <th>{labels.updated}</th>
              </tr>
            </thead>
            <tbody>
              {administration.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <Link href={`/admin/content/${entry.id}`} locale={locale}>
                      {entry.entry_key}
                    </Link>
                  </td>
                  <td>{entry.content_type}</td>
                  <td>{entry.status}</td>
                  <td>
                    {entry.approved_translation_count}/{entry.translation_count}
                  </td>
                  <td>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(entry.updated_at ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>{labels.channels}</h2>
        <div className="admin-card-grid">
          <ContactChannelEditor locale={locale} labels={labels} />
          {administration.channels.map((channel) => (
            <ContactChannelEditor
              key={channel.id}
              locale={locale}
              channel={channel}
              labels={labels}
            />
          ))}
        </div>
      </section>
      <section className="admin-panel">
        <h2 id="contact-submissions-title">{labels.contacts}</h2>
        <div
          className="table-scroll"
          role="region"
          aria-labelledby="contact-submissions-title"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>{labels.reference}</th>
                <th>{labels.status}</th>
                <th>Email</th>
                <th>{labels.updated}</th>
              </tr>
            </thead>
            <tbody>
              {administration.contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <Link
                      href={`/admin/content/contacts/${contact.id}`}
                      locale={locale}
                    >
                      {contact.reference}
                    </Link>
                  </td>
                  <td>{contact.status}</td>
                  <td>{contact.masked_email}</td>
                  <td>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(contact.updated_at ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
