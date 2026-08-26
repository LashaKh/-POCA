"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { managerCommandClient } from "@/features/auth/admin-command";
import { isAppLocale } from "@/i18n/routing";
import { getPublicEnvironment } from "@/lib/env/public";
import { logger } from "@/lib/observability/logger";
import { recordMetric } from "@/lib/observability/metrics";
import { dispatchMediaWorker } from "@/features/operations/job-dispatch";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { sha256 } from "@/features/orders/guest-proof";
import { consumePolicyRateLimit } from "@/lib/security/rate-limit";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";
import { getErrorMessage } from "@/lib/validation/error";

import {
  ingestionBatchSchema,
  retryIngestionFileSchema,
  uploadAuthorizationSchema,
  uploadCompletedSchema,
  type UploadAuthorizationInput,
} from "./schema";
import { isSafeOriginalStoragePath } from "./storage-path";

export type UploadAuthorization = {
  fileId: string;
  bucket: "product-originals";
  path: string;
  token: string;
  tusEndpoint: string;
};

async function requireCurrentManager() {
  return managerCommandClient("ingestion.admin.command");
}

function actionFailure<T>(
  correlationId: string,
  error: unknown,
): CommandResult<T> {
  const message = getErrorMessage(error, "INTERNAL_ERROR");
  const forbidden =
    message.includes("FORBIDDEN") || message.includes("AUTH_REQUIRED");
  return commandFailure(
    {
      code: forbidden ? "FORBIDDEN" : "UPLOAD_REJECTED",
      messageKey: forbidden
        ? "auth.invalidCredentials"
        : "admin.ingestion.uploadRejected",
      retryable: !forbidden,
    },
    correlationId,
  );
}

export async function createBatchAction(formData: FormData): Promise<void> {
  const parsed = ingestionBatchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const client = await requireCurrentManager();
  const { data, error } = await client.rpc("create_ingestion_batch", {
    p_title: parsed.data.title,
    p_expected_file_count: parsed.data.expectedFileCount,
    p_product_id: parsed.data.productId,
    p_correlation_id: randomUUID(),
  });
  if (error) throw error;
  revalidatePath(`/${parsed.data.locale}/admin/ingestion`);
  redirect(`/${parsed.data.locale}/admin/ingestion/${data.id}`);
}

export async function authorizeUploadAction(
  input: UploadAuthorizationInput,
): Promise<CommandResult<UploadAuthorization>> {
  const correlationId = randomUUID();
  const parsed = uploadAuthorizationSchema.safeParse(input);
  if (!parsed.success) return actionFailure(correlationId, "INVALID_INPUT");
  try {
    const client = await requireCurrentManager();
    const claims = await client.auth.getClaims();
    const profileId = claims.data?.claims?.sub;
    if (typeof profileId !== "string") throw new Error("AUTH_REQUIRED");
    const rateLimit = await consumePolicyRateLimit({
      policy: "uploadAuthorize",
      subjectHash: sha256(profileId),
    });
    if (!rateLimit.allowed) throw new Error("UPLOAD_RATE_LIMITED");
    const { data: file, error: registerError } = await client.rpc(
      "register_ingestion_file",
      {
        p_batch_id: parsed.data.batchId,
        p_client_file_id: parsed.data.clientFileId,
        p_original_filename: parsed.data.filename,
        p_expected_mime: parsed.data.declaredMime,
        p_expected_byte_size: parsed.data.byteSize,
        p_expected_checksum_sha256: parsed.data.checksumSha256,
        p_recipe_version: 1,
      },
    );
    if (registerError) throw registerError;
    if (!isSafeOriginalStoragePath(file.storage_path)) {
      throw new Error("UNSAFE_STORAGE_PATH");
    }
    const service = createServiceSupabaseClient();
    const { data: signed, error: signedError } = await service.storage
      .from("product-originals")
      .createSignedUploadUrl(file.storage_path, { upsert: false });
    if (signedError) throw signedError;
    const environment = getPublicEnvironment();
    return commandSuccess(
      {
        fileId: file.id,
        bucket: "product-originals",
        path: file.storage_path,
        token: signed.token,
        tusEndpoint: `${environment.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      },
      correlationId,
    );
  } catch (error) {
    return actionFailure(correlationId, error);
  }
}

export async function uploadCompletedAction(input: {
  fileId: string;
}): Promise<CommandResult<{ queued: true }>> {
  const correlationId = randomUUID();
  const startedAt = performance.now();
  const parsed = uploadCompletedSchema.safeParse(input);
  if (!parsed.success) return actionFailure(correlationId, "INVALID_INPUT");
  try {
    const client = await requireCurrentManager();
    const claims = await client.auth.getClaims();
    const profileId = claims.data?.claims?.sub;
    if (typeof profileId !== "string") throw new Error("AUTH_REQUIRED");
    const rateLimit = await consumePolicyRateLimit({
      policy: "exposedWrite",
      subjectHash: sha256(profileId),
    });
    if (!rateLimit.allowed) throw new Error("UPLOAD_RATE_LIMITED");
    const { error } = await client
      .from("ingestion_files")
      .update({ status: "uploaded" })
      .eq("id", parsed.data.fileId)
      .in("status", ["registered", "uploading"]);
    if (error) throw error;
    await dispatchMediaWorker();
    logger.info({
      correlationId,
      event: "ingestion.upload.completed",
      actorClass: "manager",
      outcome: "succeeded",
      durationMs: Math.round(performance.now() - startedAt),
      metadata: {
        metric: recordMetric({
          name: "command_duration_ms",
          type: "histogram",
          value: Math.round(performance.now() - startedAt),
          labels: { command: "ingestion_upload", outcome: "succeeded" },
        }),
      },
    });
    revalidatePath("/admin/ingestion", "layout");
    return commandSuccess({ queued: true }, correlationId);
  } catch (error) {
    return actionFailure(correlationId, error);
  }
}

export async function cancelBatchAction(formData: FormData) {
  const batchId = formData.get("batchId");
  const locale = formData.get("locale");
  if (typeof batchId !== "string" || !isAppLocale(locale)) return;
  const client = await requireCurrentManager();
  const { data: orphanFiles, error: fileError } = await client
    .from("ingestion_files")
    .select("storage_path")
    .eq("batch_id", batchId)
    .is("media_asset_id", null);
  if (fileError) throw fileError;
  const { error } = await client.rpc("cancel_ingestion_batch", {
    p_batch_id: batchId,
  });
  if (error) throw error;
  if (orphanFiles.length > 0) {
    const { error: cleanupError } = await client.storage
      .from("product-originals")
      .remove(orphanFiles.map((file) => file.storage_path));
    if (cleanupError) throw cleanupError;
  }
  revalidatePath(`/${locale}/admin/ingestion`);
  redirect(`/${locale}/admin/ingestion`);
}

export async function retryIngestionFileAction(formData: FormData) {
  const parsed = retryIngestionFileSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return;
  const client = await requireCurrentManager();
  const { error } = await client.rpc("retry_ingestion_file", {
    p_file_id: parsed.data.fileId,
  });
  if (error) throw error;
  await dispatchMediaWorker();
  revalidatePath(
    `/${parsed.data.locale}/admin/ingestion/${parsed.data.batchId}`,
  );
}
