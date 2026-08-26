import { ContactForm } from "@/components/content/contact-form";
import {
  getPublishedContactChannels,
  getPublishedDisclosures,
} from "@/features/content/queries";
import { getContentLabels } from "@/features/content/service-copy";
import { isAppLocale } from "@/i18n/routing";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) return null;
  const [labels, disclosures, channels] = await Promise.all([
    getContentLabels(locale),
    getPublishedDisclosures(locale),
    getPublishedContactChannels(),
  ]);
  const disclosure = disclosures.contact ?? {
    version: "contact-v1",
    copy: "",
    locale,
    fallbackDisclosed: false,
  };
  return (
    <main className="service-page" id="main-content">
      <header>
        <p className="eyebrow">ÉPOCA · contact</p>
        <h1>{labels.contactTitle}</h1>
        <p>{labels.contactIntro}</p>
      </header>
      {channels.length ? (
        <section className="contact-channels" aria-label={labels.contactTitle}>
          {channels.map((channel) => (
            <div key={channel.channel_key}>
              <strong>
                {channel.labels_i18n &&
                typeof channel.labels_i18n === "object" &&
                !Array.isArray(channel.labels_i18n)
                  ? String(
                      (channel.labels_i18n as Record<string, unknown>)[
                        locale
                      ] ?? channel.channel_key,
                    )
                  : channel.channel_key}
              </strong>
              <p>{channel.public_value}</p>
            </div>
          ))}
        </section>
      ) : null}
      <ContactForm
        locale={locale}
        disclosureVersion={disclosure.version}
        disclosure={disclosure.copy}
        labels={labels}
      />
    </main>
  );
}
