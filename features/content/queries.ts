import "server-only";

import type { AppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { normalizePublishedContent } from "./domain";

export async function getPublishedContent(entryKey: string, locale: AppLocale) {
  const client = createServiceSupabaseClient();
  const result = await client.rpc("read_published_content", {
    p_entry_key: entryKey,
    p_locale: locale,
  });
  if (result.error) throw result.error;
  return normalizePublishedContent(result.data);
}

export async function getPublishedJournal(locale: AppLocale) {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_content_projection")
    .select("entry_key,locale,slug,title,summary,published_at")
    .eq("content_type", "journal")
    .eq("locale", locale)
    .order("published_at", { ascending: false });
  if (result.error) throw result.error;
  return result.data;
}

export async function getPublishedContentBySlug(
  slug: string,
  locale: AppLocale,
) {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_content_projection")
    .select("entry_key")
    .eq("content_type", "journal")
    .eq("locale", locale)
    .eq("slug", slug)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data?.entry_key
    ? getPublishedContent(result.data.entry_key, locale)
    : undefined;
}

export async function getPublishedMenu(
  menuKey: "header" | "footer",
  locale: AppLocale,
) {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_content_menu_items")
    .select("item_key,destination_path,labels_i18n,position")
    .eq("menu_key", menuKey)
    .order("position");
  if (result.error) throw result.error;
  return result.data.map((item) => ({
    key: item.item_key,
    path: item.destination_path,
    label:
      item.labels_i18n &&
      typeof item.labels_i18n === "object" &&
      !Array.isArray(item.labels_i18n)
        ? String(
            (item.labels_i18n as Record<string, unknown>)[locale] ??
              (item.labels_i18n as Record<string, unknown>).en ??
              item.item_key,
          )
        : item.item_key,
  }));
}

export async function resolvePublishedRedirect(pathname: string) {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_content_redirects")
    .select("destination_path,http_status")
    .eq("source_path", pathname)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function getPublishedContactChannels() {
  const client = createServiceSupabaseClient();
  const result = await client
    .from("published_contact_channels")
    .select("*")
    .order("channel_type");
  if (result.error) throw result.error;
  return result.data;
}

export async function getPublishedDisclosures(locale: AppLocale) {
  const client = createServiceSupabaseClient();
  const result = await client.rpc("read_published_disclosures", {
    p_locale: locale,
  });
  if (result.error) throw result.error;
  return result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data)
    ? (result.data as Record<
        string,
        {
          version: string;
          copy: string;
          locale: string;
          fallbackDisclosed: boolean;
        }
      >)
    : {};
}

export async function getContentAdministration() {
  const client = await createServerSupabaseClient();
  const [entries, menus, redirects, channels, contacts] = await Promise.all([
    client
      .from("staff_content_queue")
      .select("*")
      .order("updated_at", { ascending: false }),
    client.from("content_menus").select("*").order("menu_key"),
    client.from("content_redirects").select("*").order("source_path"),
    client.from("contact_channels").select("*").order("channel_type"),
    client
      .from("staff_contact_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const result of [entries, menus, redirects, channels, contacts]) {
    if (result.error) throw result.error;
  }
  return {
    entries: entries.data ?? [],
    menus: menus.data ?? [],
    redirects: redirects.data ?? [],
    channels: channels.data ?? [],
    contacts: contacts.data ?? [],
  };
}

export async function getContentEntryAdministration(contentEntryId: string) {
  const client = await createServerSupabaseClient();
  const [entry, translations, revisions] = await Promise.all([
    client
      .from("content_entries")
      .select("*")
      .eq("id", contentEntryId)
      .maybeSingle(),
    client
      .from("content_translations")
      .select("*")
      .eq("content_entry_id", contentEntryId)
      .order("locale"),
    client
      .from("content_revisions")
      .select("id,version,operation,reason,created_at")
      .eq("content_entry_id", contentEntryId)
      .order("version", { ascending: false }),
  ]);
  for (const result of [entry, translations, revisions]) {
    if (result.error) throw result.error;
  }
  return {
    entry: entry.data,
    translations: translations.data ?? [],
    revisions: revisions.data ?? [],
  };
}

export async function getNavigationAdministration() {
  const client = await createServerSupabaseClient();
  const [menus, items] = await Promise.all([
    client.from("content_menus").select("*").order("menu_key"),
    client.from("content_menu_items").select("*").order("position"),
  ]);
  if (menus.error) throw menus.error;
  if (items.error) throw items.error;
  return { menus: menus.data, items: items.data };
}

export async function getContentPreview(tokenHash: string, locale: AppLocale) {
  const client = createServiceSupabaseClient();
  const result = await client.rpc("read_content_preview", {
    p_token_hash: tokenHash,
    p_locale: locale,
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function getContactAdministration(contactSubmissionId: string) {
  const client = await createServerSupabaseClient();
  const [submission, events] = await Promise.all([
    client
      .from("contact_submissions")
      .select("*")
      .eq("id", contactSubmissionId)
      .maybeSingle(),
    client
      .from("contact_submission_events")
      .select("*")
      .eq("contact_submission_id", contactSubmissionId)
      .order("created_at"),
  ]);
  if (submission.error) throw submission.error;
  if (events.error) throw events.error;
  return { submission: submission.data, events: events.data };
}
