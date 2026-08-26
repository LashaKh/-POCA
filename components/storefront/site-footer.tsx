import { getTranslations } from "next-intl/server";

import { ConsentPreferences } from "@/components/content/consent-preferences";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { getCurrentConsentChoices } from "@/features/consent/queries";
import {
  getPublishedDisclosures,
  getPublishedMenu,
} from "@/features/content/queries";
import {
  getContentLabels,
  getFallbackServiceContent,
} from "@/features/content/service-copy";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function SiteFooter({ locale }: { locale: AppLocale }) {
  const [t, catalog, labels, menu, disclosures, currentConsent] =
    await Promise.all([
      getTranslations({ locale, namespace: "common" }),
      getTranslations({ locale, namespace: "catalog" }),
      getContentLabels(locale),
      getPublishedMenu("footer", locale),
      getPublishedDisclosures(locale),
      getCurrentConsentChoices(),
    ]);
  const links = menu.length
    ? menu
    : [
        {
          key: "about",
          path: "/about",
          label: getFallbackServiceContent("about", locale).title,
        },
        {
          key: "delivery",
          path: "/delivery",
          label: getFallbackServiceContent("delivery", locale).title,
        },
        {
          key: "returns",
          path: "/returns",
          label: getFallbackServiceContent("returns", locale).title,
        },
        {
          key: "privacy",
          path: "/privacy",
          label: getFallbackServiceContent("privacy", locale).title,
        },
        {
          key: "cookie",
          path: "/cookie",
          label: getFallbackServiceContent("cookie", locale).title,
        },
        {
          key: "terms",
          path: "/terms",
          label: getFallbackServiceContent("terms", locale).title,
        },
        { key: "contact", path: "/contact", label: t("contact") },
      ];
  const newsletter = disclosures.newsletter ?? {
    version: "newsletter-v1",
    copy: "",
  };

  return (
    <footer className="site-footer-wrapper">
      <NewsletterForm
        locale={locale}
        disclosureVersion={newsletter.version}
        disclosure={newsletter.copy}
        labels={labels}
      />
      <div className="site-footer">
        <div>
          <p>© {new Date().getUTCFullYear()} ÉPOCA</p>
          <p>{t("home")} · Tbilisi, Georgia</p>
          <p>{catalog("worldwideDelivery")}</p>
        </div>
        <nav aria-label={t("contact")} className="footer-navigation">
          {links.map((item) => (
            <Link
              href={
                (item.path ?? "/").replace(/^\/(ka|en|de|ru)(?=\/|$)/, "") ||
                "/"
              }
              locale={locale}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ConsentPreferences
          locale={locale}
          disclosures={disclosures}
          current={currentConsent}
          labels={labels}
        />
      </div>
    </footer>
  );
}
