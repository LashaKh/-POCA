import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { expect, test, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

vi.mock("server-only", () => ({}));

function localEnvironment() {
  const output = execFileSync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  return Object.fromEntries(
    output
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          JSON.parse(line.slice(separator + 1)),
        ];
      }),
  ) as Record<string, string>;
}

test("250-file burst and 12-image processing stay bounded and idempotent", async () => {
  const local = localEnvironment();
  process.env.DEPLOY_ENV = "local";
  process.env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = local.PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;
  process.env.PAYMENT_PROVIDER_MODE = "disabled";
  process.env.EMAIL_PROVIDER_MODE = "disabled";
  process.env.ASSISTANCE_PROVIDER_MODE = "disabled";
  process.env.ANALYTICS_PROVIDER_MODE = "disabled";
  process.env.MONITORING_PROVIDER_MODE = "disabled";
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { processIngestionWork } = await import("@/features/media/worker");
  const unique = crypto.randomUUID().slice(0, 8);
  let burstBatchId: string | undefined;
  let burstProductId: string | undefined;
  let mediaBatchId: string | undefined;
  let mediaProductId: string | undefined;
  const originalPaths: string[] = [];
  const assetIds: string[] = [];
  const renditionPaths: string[] = [];

  try {
    const { data: burstBatch, error: burstBatchError } = await service.rpc(
      "create_ingestion_batch",
      { p_title: `Burst ${unique}`, p_expected_file_count: 250 },
    );
    if (burstBatchError) throw burstBatchError;
    burstBatchId = burstBatch.id;
    burstProductId = burstBatch.product_id ?? undefined;
    const burstStarted = performance.now();
    for (let offset = 0; offset < 250; offset += 25) {
      const registrations = await Promise.all(
        Array.from({ length: 25 }, (_, index) => {
          const number = offset + index;
          return service.rpc("register_ingestion_file", {
            p_batch_id: burstBatch.id,
            p_client_file_id: `burst-${unique}-${number.toString().padStart(3, "0")}`,
            p_original_filename: `burst-${number}.jpg`,
            p_expected_mime: "image/jpeg",
            p_expected_byte_size: 1024,
            p_recipe_version: 1,
          });
        }),
      );
      const registrationError = registrations.find((result) => result.error);
      if (registrationError?.error) throw registrationError.error;
    }
    const burstRegistrationMs = Math.round(performance.now() - burstStarted);
    const { count: burstCount, error: burstCountError } = await service
      .from("ingestion_files")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", burstBatch.id);
    if (burstCountError) throw burstCountError;
    expect(burstCount).toBe(250);

    const { data: mediaBatch, error: mediaBatchError } = await service.rpc(
      "create_ingestion_batch",
      { p_title: `Twelve image ${unique}`, p_expected_file_count: 12 },
    );
    if (mediaBatchError) throw mediaBatchError;
    mediaBatchId = mediaBatch.id;
    mediaProductId = mediaBatch.product_id ?? undefined;
    const images = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        sharp({
          create: {
            width: 240 + index,
            height: 300 + index,
            channels: 3,
            background: {
              r: 40 + index * 9,
              g: 70 + index * 7,
              b: 90 + index * 5,
            },
          },
        })
          .jpeg({ quality: 88 })
          .toBuffer(),
      ),
    );
    const mediaRegistrations = await Promise.all(
      images.map((image, index) =>
        service.rpc("register_ingestion_file", {
          p_batch_id: mediaBatch.id,
          p_client_file_id: `media-${unique}-${index.toString().padStart(2, "0")}`,
          p_original_filename: `rug-${index}.jpg`,
          p_expected_mime: "image/jpeg",
          p_expected_byte_size: image.byteLength,
          p_recipe_version: 1,
        }),
      ),
    );
    const mediaRegistrationError = mediaRegistrations.find(
      (result) => result.error,
    );
    if (mediaRegistrationError?.error) throw mediaRegistrationError.error;
    await Promise.all(
      mediaRegistrations.map(async (registration, index) => {
        const file = registration.data!;
        originalPaths.push(file.storage_path);
        const { error: uploadError } = await service.storage
          .from("product-originals")
          .upload(file.storage_path, images[index], {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        const { error: stateError } = await service
          .from("ingestion_files")
          .update({ status: "uploaded" })
          .eq("id", file.id);
        if (stateError) throw stateError;
      }),
    );

    let peakRssBytes = process.memoryUsage().rss;
    const memorySampler = setInterval(() => {
      peakRssBytes = Math.max(peakRssBytes, process.memoryUsage().rss);
    }, 25);
    const processingStarted = performance.now();
    const workerPasses = [];
    try {
      for (let pass = 0; pass < 4; pass += 1) {
        workerPasses.push(
          await processIngestionWork({
            timeBudgetMs: 50_000,
            maxInspections: 12,
            maxJobs: 12,
          }),
        );
        const { count: readyCount } = await service
          .from("ingestion_files")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", mediaBatch.id)
          .eq("status", "ready");
        if (readyCount === 12) break;
      }
    } finally {
      clearInterval(memorySampler);
    }
    const processingDurationMs = Math.round(
      performance.now() - processingStarted,
    );
    const { data: processedFiles, error: processedFilesError } = await service
      .from("ingestion_files")
      .select("status,media_asset_id")
      .eq("batch_id", mediaBatch.id);
    if (processedFilesError) throw processedFilesError;
    expect(processedFiles.every((file) => file.status === "ready")).toBe(true);
    assetIds.push(
      ...processedFiles.flatMap((file) =>
        file.media_asset_id ? [file.media_asset_id] : [],
      ),
    );
    const { data: variants, error: variantsError } = await service
      .from("media_variants")
      .select("path")
      .in("asset_id", assetIds);
    if (variantsError) throw variantsError;
    renditionPaths.push(...variants.map((variant) => variant.path));
    const uniqueRenditions = new Set(renditionPaths).size;
    expect(renditionPaths).toHaveLength(12 * 9);
    expect(uniqueRenditions).toBe(12 * 9);
    const secondPass = await processIngestionWork({
      timeBudgetMs: 5_000,
      maxInspections: 12,
      maxJobs: 12,
    });
    expect(secondPass).toMatchObject({
      inspected: 0,
      claimed: 0,
      completed: 0,
    });
    const { data: jobs, error: jobsError } = await service
      .from("media_jobs")
      .select("queued_at,completed_at,attempt")
      .in(
        "subject_id",
        mediaRegistrations.map((item) => item.data!.id),
      );
    if (jobsError) throw jobsError;
    const maxQueueAgeMs = Math.max(
      ...jobs.map(
        (job) =>
          new Date(job.completed_at!).getTime() -
          new Date(job.queued_at).getTime(),
      ),
    );
    const report = {
      burstFiles: burstCount,
      burstRegistrationMs,
      completedImages: processedFiles.length,
      renditions: renditionPaths.length,
      uniqueRenditions,
      duplicateOutputs: renditionPaths.length - uniqueRenditions,
      processingDurationMs,
      maxQueueAgeMs,
      peakRssMb: Math.round(peakRssBytes / 1024 / 1024),
      workerPasses,
      maxJobAttempts: Math.max(...jobs.map((job) => job.attempt)),
      idempotentSecondPass: secondPass,
    };
    console.log(`__MEDIA_LOAD_REPORT__${JSON.stringify(report)}`);
    expect(processingDurationMs).toBeLessThan(120_000);
    expect(maxQueueAgeMs).toBeLessThan(120_000);
    expect(report.peakRssMb).toBeLessThan(1024);
  } finally {
    if (renditionPaths.length > 0) {
      await service.storage.from("product-renditions").remove(renditionPaths);
    }
    if (originalPaths.length > 0) {
      await service.storage.from("product-originals").remove(originalPaths);
    }
    if (mediaBatchId) {
      await service.from("ingestion_batches").delete().eq("id", mediaBatchId);
    }
    if (assetIds.length > 0) {
      await service.from("media_assets").delete().in("id", assetIds);
    }
    if (mediaProductId) {
      await service.from("products").delete().eq("id", mediaProductId);
    }
    if (burstBatchId) {
      await service.from("ingestion_batches").delete().eq("id", burstBatchId);
    }
    if (burstProductId) {
      await service.from("products").delete().eq("id", burstProductId);
    }
  }
}, 180_000);
