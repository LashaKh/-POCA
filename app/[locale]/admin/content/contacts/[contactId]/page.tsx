import { ContactOperations } from "@/components/admin/content/contact-operations";
import { getContentAdminLabels } from "@/features/content/admin-copy";
import { getContactAdministration } from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function ContactAdministrationPage({
  params,
}: {
  params: Promise<{ locale: string; contactId: string }>;
}) {
  const { locale, contactId } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, administration] = await Promise.all([
    getContentAdminLabels(locale),
    getContactAdministration(contactId),
  ]);
  if (!administration.submission) return null;
  const submission = administration.submission;
  return (
    <main className="admin-main" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{labels.contacts}</p>
        <h1>{submission.reference}</h1>
      </header>
      <section className="admin-panel contact-record">
        <dl>
          <dt>{labels.status}</dt>
          <dd>{submission.status}</dd>
          <dt>Email</dt>
          <dd>{submission.contact_email}</dd>
          <dt>{labels.titleLabel}</dt>
          <dd>{submission.subject}</dd>
          <dt>{labels.reference}</dt>
          <dd>{submission.order_reference ?? "—"}</dd>
        </dl>
        <h2>Message</h2>
        <p className="preserve-whitespace">{submission.message}</p>
      </section>
      <ContactOperations
        locale={locale}
        submission={submission}
        labels={labels}
      />
      <section className="admin-panel">
        <h2>{labels.updated}</h2>
        <ol className="timeline">
          {administration.events.map((event) => (
            <li key={event.id}>
              <strong>{event.event_type}</strong>
              {event.safe_note ? <p>{event.safe_note}</p> : null}
              <time>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(event.created_at))}
              </time>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
