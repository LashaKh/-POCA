import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { logger } from "@/lib/observability/logger";
import { recordMetric } from "@/lib/observability/metrics";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/validation/error";

import { processProductRenditions, inspectImageBuffer } from "./processor";
import { PRODUCT_RECIPE_VERSION } from "./recipe";
import { renditionStoragePath } from "@/features/ingestion/storage-path";

const workerId = `media-${randomUUID()}`;

function bufferChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function ensureRenditionObject({
  path,
  buffer,
  checksumSha256,
  contentType,
}: {
  path: string;
  buffer: Buffer;
  checksumSha256: string;
  contentType: string;
}) {
  const service = createServiceSupabaseClient();
  const bucket = service.storage.from("product-renditions");
  const { error: uploadError } = await bucket.upload(path, buffer, {
    contentType,
    cacheControl: "31536000, immutable",
    upsert: false,
  });
  if (!uploadError) return;
  if (!uploadError.message.toLowerCase().includes("exist")) throw uploadError;

  const { data: existing, error: downloadError } = await bucket.download(path);
  if (downloadError) throw downloadError;
  const existingBuffer = Buffer.from(await existing.arrayBuffer());
  if (bufferChecksum(existingBuffer) === checksumSha256) return;

  const { error: removeError } = await bucket.remove([path]);
  if (removeError) throw removeError;
  const { error: recoveryUploadError } = await bucket.upload(path, buffer, {
    contentType,
    cacheControl: "31536000, immutable",
    upsert: false,
  });
  if (recoveryUploadError) throw recoveryUploadError;
}

function safeJobError(error: unknown) {
  const message = getErrorMessage(error, "MEDIA_PROCESSING_FAILED");
  const code = /^[A-Z0-9_]{2,80}$/.test(message)
    ? message
    : "MEDIA_PROCESSING_FAILED";
  return {
    code,
    summary:
      "The image could not be processed safely. The source remains private for review.",
  };
}

async function inspectUploadedFiles(limit: number, deadline: number) {
  const service = createServiceSupabaseClient();
  const { data: files, error } = await service
    .from("ingestion_files")
    .select("id,storage_bucket,storage_path,expected_mime")
    .eq("status", "uploaded")
    .is("actual_checksum_sha256", null)
    .order("created_at")
    .limit(limit);
  if (error) throw error;
  let inspectedCount = 0;
  for (const file of files) {
    if (Date.now() >= deadline) break;
    const { data: blob, error: downloadError } = await service.storage
      .from(file.storage_bucket)
      .download(file.storage_path);
    if (downloadError) throw downloadError;
    const input = Buffer.from(await blob.arrayBuffer());
    try {
      const inspected = await inspectImageBuffer(
        input,
        file.expected_mime as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/tiff",
      );
      const { error: completionError } = await service.rpc(
        "complete_ingestion_upload",
        {
          p_file_id: file.id,
          p_actual_mime: inspected.actualMime,
          p_actual_byte_size: inspected.byteSize,
          p_actual_checksum_sha256: inspected.checksumSha256,
          p_pixel_width: inspected.pixelWidth,
          p_pixel_height: inspected.pixelHeight,
          p_orientation: inspected.orientation,
        },
      );
      if (completionError) throw completionError;
      inspectedCount += 1;
    } catch (inspectionError) {
      const safe = safeJobError(inspectionError);
      const { error: updateError } = await service
        .from("ingestion_files")
        .update({
          status: "failed",
          safe_error_code: safe.code,
          safe_error_summary: safe.summary,
        })
        .eq("id", file.id);
      if (updateError) throw updateError;
    }
  }
  return inspectedCount;
}

async function processClaimedJob(job: {
  id: string;
  subject_id: string | null;
}) {
  if (!job.subject_id) throw new Error("JOB_SUBJECT_MISSING");
  const service = createServiceSupabaseClient();
  const { data: file, error: fileError } = await service
    .from("ingestion_files")
    .select(
      "id,storage_bucket,storage_path,expected_mime,media_asset_id,recipe_version",
    )
    .eq("id", job.subject_id)
    .single();
  if (fileError) throw fileError;
  if (!file.media_asset_id) throw new Error("MEDIA_ASSET_MISSING");
  const { data: blob, error: downloadError } = await service.storage
    .from(file.storage_bucket)
    .download(file.storage_path);
  if (downloadError) throw downloadError;
  const input = Buffer.from(await blob.arrayBuffer());
  const { renditions } = await processProductRenditions(
    input,
    file.expected_mime as
      | "image/jpeg"
      | "image/png"
      | "image/webp"
      | "image/tiff",
  );
  const { error: checkpointError } = await service.rpc(
    "checkpoint_ingestion_job",
    {
      p_job_id: job.id,
      p_worker_id: workerId,
      p_progress_stage: "uploading-renditions",
      p_extend_seconds: 300,
    },
  );
  if (checkpointError) throw checkpointError;

  for (const rendition of renditions) {
    const path = renditionStoragePath({
      assetId: file.media_asset_id,
      recipeVersion: PRODUCT_RECIPE_VERSION,
      role: rendition.role,
      width: rendition.width,
      format: rendition.format,
    });
    const contentType =
      rendition.format === "jpeg" ? "image/jpeg" : `image/${rendition.format}`;
    await ensureRenditionObject({
      path,
      buffer: rendition.buffer,
      checksumSha256: rendition.checksumSha256,
      contentType,
    });
    const { error: variantError } = await service.from("media_variants").upsert(
      {
        asset_id: file.media_asset_id,
        recipe_version: file.recipe_version,
        role: rendition.role,
        format: rendition.format,
        width: rendition.width,
        height: rendition.height,
        crop_x: rendition.crop.x,
        crop_y: rendition.crop.y,
        focal_x: rendition.focalPoint.x,
        focal_y: rendition.focalPoint.y,
        bucket: "product-renditions",
        path,
        checksum_sha256: rendition.checksumSha256,
        byte_size: rendition.byteSize,
        status: "processing",
      },
      {
        onConflict: "asset_id,recipe_version,role,format,width",
        ignoreDuplicates: false,
      },
    );
    if (variantError) throw variantError;
  }
  const { data: completed, error: completionError } = await service.rpc(
    "complete_ingestion_job",
    { p_job_id: job.id, p_worker_id: workerId },
  );
  if (completionError) throw completionError;
  if (!completed) throw new Error("JOB_LEASE_LOST");
}

export async function processIngestionWork({
  timeBudgetMs = 22_000,
  maxInspections = 2,
  maxJobs = 1,
}: {
  timeBudgetMs?: number;
  maxInspections?: number;
  maxJobs?: number;
} = {}) {
  const startedAt = Date.now();
  const deadline = startedAt + Math.min(Math.max(timeBudgetMs, 1_000), 50_000);
  const inspected = await inspectUploadedFiles(maxInspections, deadline);
  const service = createServiceSupabaseClient();
  const { data: jobs, error } = await service.rpc("claim_ingestion_jobs", {
    p_worker_id: workerId,
    p_claim_limit: maxJobs,
    p_lease_seconds: 360,
  });
  if (error) throw error;
  let completed = 0;
  let retrying = 0;
  for (const job of jobs) {
    if (Date.now() >= deadline) break;
    try {
      await processClaimedJob(job);
      completed += 1;
    } catch (jobError) {
      const safe = safeJobError(jobError);
      const { error: failureError } = await service.rpc("fail_ingestion_job", {
        p_job_id: job.id,
        p_worker_id: workerId,
        p_safe_error_code: safe.code,
        p_safe_error_summary: safe.summary,
      });
      if (failureError) throw failureError;
      retrying += 1;
    }
  }
  const result = {
    inspected,
    claimed: jobs.length,
    completed,
    retrying,
    durationMs: Date.now() - startedAt,
  };
  logger.info({
    correlationId: randomUUID(),
    event: "media.ingestion-worker",
    actorClass: "service",
    outcome: retrying > 0 ? "retrying" : "succeeded",
    durationMs: result.durationMs,
    metadata: {
      ...result,
      metric: recordMetric({
        name: "worker_duration_ms",
        type: "histogram",
        value: result.durationMs,
        labels: {
          job: "media_ingestion",
          outcome: retrying > 0 ? "retrying" : "succeeded",
        },
      }),
    },
  });
  return result;
}
