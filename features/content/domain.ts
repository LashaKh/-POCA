import type { AppLocale } from "@/i18n/routing";

import { contentBlockSchema, type ContentBlock } from "./schema";

export type LocalizedContent = {
  entryKey: string;
  contentType: string;
  legalStatus: string;
  requestedLocale: AppLocale;
  resolvedLocale: AppLocale;
  fallbackDisclosed: boolean;
  fallbackPolicy: "disclose" | "strict";
  publishedAt: string | null;
  translation: {
    slug: string;
    title: string;
    summary: string | null;
    blocks: ContentBlock[];
    meta_title: string | null;
    meta_description: string | null;
    social_image_url: string | null;
  };
};

export function normalizePublishedContent(
  value: unknown,
): LocalizedContent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const translation = record.translation;
  if (!translation || typeof translation !== "object") return undefined;
  const translated = translation as Record<string, unknown>;
  const blocks = contentBlockSchema.array().safeParse(translated.blocks);
  if (
    !blocks.success ||
    typeof translated.title !== "string" ||
    typeof translated.slug !== "string"
  ) {
    return undefined;
  }
  const requestedLocale = record.requestedLocale;
  const resolvedLocale = record.resolvedLocale;
  if (
    !["ka", "en", "de", "ru"].includes(String(requestedLocale)) ||
    !["ka", "en", "de", "ru"].includes(String(resolvedLocale))
  ) {
    return undefined;
  }
  return {
    entryKey: String(record.entryKey ?? ""),
    contentType: String(record.contentType ?? ""),
    legalStatus: String(record.legalStatus ?? "not_applicable"),
    requestedLocale: requestedLocale as AppLocale,
    resolvedLocale: resolvedLocale as AppLocale,
    fallbackDisclosed: record.fallbackDisclosed === true,
    fallbackPolicy: record.fallbackPolicy === "strict" ? "strict" : "disclose",
    publishedAt:
      typeof record.publishedAt === "string" ? record.publishedAt : null,
    translation: {
      slug: translated.slug,
      title: translated.title,
      summary:
        typeof translated.summary === "string" ? translated.summary : null,
      blocks: blocks.data,
      meta_title:
        typeof translated.meta_title === "string"
          ? translated.meta_title
          : null,
      meta_description:
        typeof translated.meta_description === "string"
          ? translated.meta_description
          : null,
      social_image_url:
        typeof translated.social_image_url === "string"
          ? translated.social_image_url
          : null,
    },
  };
}

export function redirectGraphHasLoop(
  redirects: Array<{ sourcePath: string; destinationPath: string }>,
) {
  const next = new Map(
    redirects.map((redirect) => [
      redirect.sourcePath,
      redirect.destinationPath,
    ]),
  );
  for (const source of next.keys()) {
    const visited = new Set<string>();
    let current: string | undefined = source;
    while (current && next.has(current)) {
      if (visited.has(current)) return true;
      visited.add(current);
      current = next.get(current);
    }
  }
  return false;
}

export function scheduleIsValid(publishAt?: string, unpublishAt?: string) {
  if (!publishAt) return true;
  const publish = new Date(publishAt).getTime();
  const unpublish = unpublishAt ? new Date(unpublishAt).getTime() : undefined;
  return (
    Number.isFinite(publish) &&
    (unpublish === undefined ||
      (Number.isFinite(unpublish) && unpublish > publish))
  );
}
