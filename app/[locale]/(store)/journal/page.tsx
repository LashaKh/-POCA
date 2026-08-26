import { getTranslations } from "next-intl/server";

import { getPublishedJournal } from "@/features/content/queries";
import { getContentLabels } from "@/features/content/service-copy";
import { Link } from "@/i18n/navigation";
import { isAppLocale } from "@/i18n/routing";
import { ArrowUpRightIcon } from "@/components/ui";

export default async function JournalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, entries, common] = await Promise.all([
    getContentLabels(locale),
    getPublishedJournal(locale),
    getTranslations({ locale, namespace: "common" }),
  ]);
  return (
    <main className="service-page journal-page" id="main-content">
      <header className="journal-hero">
        <div>
          <p className="eyebrow">ÉPOCA · 01</p>
          <h1>{labels.journal}</h1>
        </div>
        <p className="journal-intro">{labels.journalIntro}</p>
      </header>
      {entries.length ? (
        <div className="journal-grid">
          {entries.map((entry, index) => (
            <article className="journal-entry" key={entry.entry_key}>
              <p className="journal-entry-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </p>
              <div>
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
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section
          className="journal-empty"
          aria-labelledby="journal-empty-title"
        >
          <p className="journal-empty-number" aria-hidden="true">
            01
          </p>
          <div className="journal-empty-copy">
            <p className="eyebrow">ÉPOCA · {labels.journal}</p>
            <h2 id="journal-empty-title">{labels.emptyJournal}</h2>
            <p>{labels.journalEmptyBody}</p>
            <Link className="journal-empty-link" href="/search" locale={locale}>
              {labels.journalBrowse}
              <ArrowUpRightIcon className="action-icon" />
              <span className="visually-hidden"> — {common("home")}</span>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
