import { getContactMessageStatus } from "@/features/contact/queries";
import { getContentLabels } from "@/features/content/service-copy";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function ContactStatusPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, status] = await Promise.all([
    getContentLabels(locale),
    getContactMessageStatus(reference),
  ]);
  return (
    <main className="service-page" id="main-content">
      <header>
        <p className="eyebrow">ÉPOCA · support</p>
        <h1>{labels.statusTitle}</h1>
      </header>
      {status ? (
        <section className="admin-panel">
          <p>
            {labels.reference}: <strong>{status.reference}</strong>
          </p>
          <p>
            {labels.statusTitle}: <strong>{status.status}</strong>
          </p>
          <p>
            <time>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(status.updatedAt))}
            </time>
          </p>
        </section>
      ) : (
        <p className="notice notice-warning">{labels.statusUnavailable}</p>
      )}
    </main>
  );
}
