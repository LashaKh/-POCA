import { getTranslations } from "next-intl/server";

import { Notice } from "@/components/ui";
import { getPublishedContent } from "@/features/content/queries";
import { getFallbackServiceContent } from "@/features/content/service-copy";
import type { AppLocale } from "@/i18n/routing";

import { ContentRenderer } from "./content-renderer";

export async function ServiceContentPage({
  contentKey,
  locale,
}: {
  contentKey:
    | "about"
    | "faq"
    | "delivery"
    | "returns"
    | "privacy"
    | "cookie"
    | "terms";
  locale: AppLocale;
}) {
  const [content, t] = await Promise.all([
    getPublishedContent(contentKey, locale),
    getTranslations({ locale, namespace: "content" }),
  ]);
  const fallback = getFallbackServiceContent(contentKey, locale);
  const title = content?.translation.title ?? fallback.title;
  const summary = content?.translation.summary ?? fallback.summary;
  const blocks = content?.translation.blocks ?? fallback.blocks;
  const legalDraft = content
    ? content.legalStatus === "draft_unapproved"
    : ["delivery", "returns", "privacy", "cookie", "terms"].includes(
        contentKey,
      );
  return (
    <main className="service-page" id="main-content">
      <header>
        <p className="eyebrow">ÉPOCA · {contentKey}</p>
        <h1>{title}</h1>
        <p>{summary}</p>
      </header>
      {content?.fallbackDisclosed ? (
        <Notice tone="warning">
          {t("fallbackNotice", {
            language: content.resolvedLocale.toUpperCase(),
          })}
        </Notice>
      ) : null}
      {legalDraft ? <Notice tone="warning">{t("legalDraft")}</Notice> : null}
      <ContentRenderer blocks={blocks} />
    </main>
  );
}
