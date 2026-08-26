"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import { locales } from "@/i18n/routing";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import {
  contactChannelSchema,
  contentEntrySchema,
  contentMenuSchema,
  contentRedirectSchema,
  contentTransitionSchema,
  parseBlocksJson,
} from "./schema";

export type ContentActionState =
  | CommandResult<{ changed: true; previewPath?: string }>
  | undefined;

function failure(correlationId: string, code = "INVALID_INPUT") {
  return commandFailure(
    {
      code: code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "INVALID_INPUT",
      messageKey:
        code === "VERSION_CONFLICT"
          ? "admin.content.errors.conflict"
          : "admin.content.errors.failed",
      retryable: code === "VERSION_CONFLICT",
    },
    correlationId,
  );
}

function optionalIso(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function checkbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function localizedLabels(formData: FormData) {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      String(formData.get(`label_${locale}`) ?? ""),
    ]),
  );
}

export async function saveContentEntryAction(
  _previous: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const correlationId = randomUUID();
  const translations = locales.map((locale) => ({
    locale,
    slug: String(formData.get(`slug_${locale}`) ?? ""),
    title: String(formData.get(`title_${locale}`) ?? ""),
    summary: String(formData.get(`summary_${locale}`) ?? ""),
    blocks: parseBlocksJson(formData.get(`blocks_${locale}`)),
    metaTitle: String(formData.get(`metaTitle_${locale}`) ?? ""),
    metaDescription: String(formData.get(`metaDescription_${locale}`) ?? ""),
    socialImageUrl: String(formData.get(`socialImageUrl_${locale}`) ?? ""),
    reviewStatus: String(formData.get(`reviewStatus_${locale}`) ?? "draft"),
  }));
  const parsed = contentEntrySchema.safeParse({
    ...Object.fromEntries(formData),
    translations,
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("content.entry.save");
  const result = await client.rpc("save_content_entry", {
    p_content_entry_id: parsed.data.contentEntryId || undefined,
    p_entry_key: parsed.data.entryKey,
    p_content_type: parsed.data.contentType,
    p_fallback_policy: parsed.data.fallbackPolicy,
    p_legal_status: parsed.data.legalStatus,
    p_translations: parsed.data.translations,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INVALID_INPUT",
    );
  }
  revalidatePath(`/${parsed.data.locale}/admin/content`);
  revalidatePath(`/${parsed.data.locale}/admin/content/${result.data.id}`);
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}

export async function transitionContentEntryAction(
  _previous: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const correlationId = randomUUID();
  const parsed = contentTransitionSchema.safeParse({
    ...Object.fromEntries(formData),
    publishAt: optionalIso(formData.get("publishAt")),
    unpublishAt: optionalIso(formData.get("unpublishAt")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("content.entry.transition");
  const result = await client.rpc("transition_content_entry", {
    p_content_entry_id: parsed.data.contentEntryId,
    p_target_status: parsed.data.targetStatus,
    p_publish_at: parsed.data.publishAt,
    p_unpublish_at: parsed.data.unpublishAt,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INVALID_INPUT",
    );
  }
  revalidatePath(`/${parsed.data.locale}/admin/content`);
  revalidatePath(
    `/${parsed.data.locale}/admin/content/${parsed.data.contentEntryId}`,
  );
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}

export async function createContentPreviewAction(
  _previous: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const correlationId = randomUUID();
  const contentEntryId = String(formData.get("contentEntryId") ?? "");
  const locale = String(formData.get("locale") ?? "");
  if (
    !/^[0-9a-f-]{36}$/.test(contentEntryId) ||
    !locales.some((item) => item === locale)
  ) {
    return failure(correlationId);
  }
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const client = await managerCommandClient("content.preview.create");
  const result = await client.rpc("create_content_preview_token", {
    p_content_entry_id: contentEntryId,
    p_token_hash: tokenHash,
    p_ttl_minutes: 30,
  });
  if (result.error) return failure(correlationId);
  return commandSuccess(
    { changed: true, previewPath: `/${locale}/preview/${token}` },
    correlationId,
  );
}

export async function publishContentMenuAction(
  _previous: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const correlationId = randomUUID();
  let items: unknown;
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return failure(correlationId);
  }
  const parsed = contentMenuSchema.safeParse({
    ...Object.fromEntries(formData),
    items,
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("content.menu.publish");
  const result = await client.rpc("publish_content_menu", {
    p_menu_key: parsed.data.menuKey,
    p_items: parsed.data.items,
    p_status: parsed.data.status,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INVALID_INPUT",
    );
  revalidatePath(`/${parsed.data.locale}/admin/content/navigation`);
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}

export async function configureContentRedirectAction(
  _previous: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const correlationId = randomUUID();
  const parsed = contentRedirectSchema.safeParse({
    ...Object.fromEntries(formData),
    activeFrom: optionalIso(formData.get("activeFrom")),
    activeUntil:
      String(formData.get("activeUntil") ?? "") === "infinity"
        ? "infinity"
        : optionalIso(formData.get("activeUntil")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient("content.redirect.configure");
  const result = await client.rpc("configure_content_redirect", {
    p_redirect_id: parsed.data.redirectId || undefined,
    p_source_path: parsed.data.sourcePath,
    p_destination_path: parsed.data.destinationPath,
    p_http_status: parsed.data.httpStatus,
    p_status: parsed.data.status,
    p_active_from: parsed.data.activeFrom,
    p_active_until: parsed.data.activeUntil,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INVALID_INPUT",
    );
  revalidatePath(`/${parsed.data.locale}/admin/content/redirects`);
  return commandSuccess({ changed: true }, correlationId);
}

export async function configureContactChannelAction(
  _previous: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const correlationId = randomUUID();
  const parsed = contactChannelSchema.safeParse({
    ...Object.fromEntries(formData),
    labels: localizedLabels(formData),
    enabled: checkbox(formData.get("enabled")),
    verified: checkbox(formData.get("verified")),
  });
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient(
    "content.contact-channel.configure",
  );
  const result = await client.rpc("configure_contact_channel", {
    p_channel_id: parsed.data.channelId || undefined,
    p_channel_key: parsed.data.channelKey,
    p_channel_type: parsed.data.channelType,
    p_public_value: parsed.data.publicValue,
    p_labels_i18n: parsed.data.labels,
    p_enabled: parsed.data.enabled,
    p_verified: parsed.data.verified,
    p_configuration_status: parsed.data.configurationStatus,
    p_expected_version: parsed.data.expectedVersion,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INVALID_INPUT",
    );
  revalidatePath(`/${parsed.data.locale}/admin/content`);
  revalidatePath("/", "layout");
  return commandSuccess({ changed: true }, correlationId);
}
