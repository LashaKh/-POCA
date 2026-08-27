import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

import { Notice } from "@/components/ui";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { getPublishedContent } from "@/features/content/queries";
import { getFallbackServiceContent } from "@/features/content/service-copy";
import type { AppLocale } from "@/i18n/routing";
import {
  buildBreadcrumbStructuredData,
  getCanonicalOrigin,
  serializeStructuredData,
} from "@/features/catalog/metadata";

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
  const [content, t, common, catalog] = await Promise.all([
    getPublishedContent(contentKey, locale),
    getTranslations({ locale, namespace: "content" }),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "catalog" }),
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <main className="service-page" id="main-content">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(
            buildBreadcrumbStructuredData([
              {
                name: common("home"),
                url: `${getCanonicalOrigin()}/${locale}`,
              },
              {
                name: title,
                url: `${getCanonicalOrigin()}/${locale}/${contentKey}`,
              },
            ]),
          ),
        }}
      />
      <Breadcrumbs
        locale={locale}
        label={catalog("breadcrumbs")}
        items={[{ label: common("home"), href: "/" }, { label: title }]}
      />
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
