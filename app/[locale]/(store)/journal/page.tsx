import { getPublishedJournal } from "@/features/content/queries";
import { getContentLabels } from "@/features/content/service-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, entries] = await Promise.all([
    getContentLabels(locale),
    getPublishedJournal(locale),
  ]);
  return (
    <main className="service-page" id="main-content">
      <header>
        <p className="eyebrow">ÉPOCA</p>
        <h1>{labels.journal}</h1>
        <p>{labels.journalIntro}</p>
      </header>
      {entries.length ? (
        <div className="journal-grid">
          {entries.map((entry) => (
            <article className="admin-panel" key={entry.entry_key}>
              <h2>
                <Link href={`/journal/${entry.slug}`} locale={locale}>
                  {entry.title}
                </Link>
              </h2>
              {entry.summary ? <p>{entry.summary}</p> : null}
              <time>
                {entry.published_at
                  ? new Intl.DateTimeFormat(locale, {
                      dateStyle: "long",
                    }).format(new Date(entry.published_at))
                  : null}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p>{labels.emptyJournal}</p>
      )}
    </main>
  );
}
