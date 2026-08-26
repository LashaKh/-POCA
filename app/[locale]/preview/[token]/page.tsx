import { createHash } from "node:crypto";
import { notFound } from "next/navigation";

import { ContentRenderer } from "@/components/content/content-renderer";
import { contentBlockSchema } from "@/features/content/schema";
import { getContentPreview } from "@/features/content/queries";
import { isAppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ContentPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isAppLocale(locale) || !/^[A-Za-z0-9_-]{32,128}$/.test(token))
    notFound();
  const value = await getContentPreview(
    createHash("sha256").update(token).digest("hex"),
    locale,
  );
  if (!value || typeof value !== "object" || Array.isArray(value)) notFound();
  const translation = (value as Record<string, unknown>).translation;
  if (
    !translation ||
    typeof translation !== "object" ||
    Array.isArray(translation)
  )
    notFound();
  const record = translation as Record<string, unknown>;
  const blocks = contentBlockSchema.array().safeParse(record.blocks);
  if (!blocks.success || typeof record.title !== "string") notFound();
  return (
    <main className="service-page" id="main-content">
      <div className="notice notice-warning">
        Private preview · expires automatically · not indexed
      </div>
      <header>
        <p className="eyebrow">ÉPOCA preview</p>
        <h1>{record.title}</h1>
        {typeof record.summary === "string" ? <p>{record.summary}</p> : null}
      </header>
      <ContentRenderer blocks={blocks.data} />
    </main>
  );
}
