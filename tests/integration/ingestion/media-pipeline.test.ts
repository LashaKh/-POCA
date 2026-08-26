import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";
import { renditionStoragePath } from "@/features/ingestion/storage-path";
import { PRODUCT_RENDITIONS } from "@/features/media/recipe";

vi.mock("server-only", () => ({}));

function localSupabaseEnvironment() {
  try {
    const executable = resolve(process.cwd(), "node_modules/.bin/supabase");
    const output = execFileSync(executable, ["status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
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
  } catch {
    return undefined;
  }
}

const local = localSupabaseEnvironment();

describe.skipIf(!local)("local Storage and media worker boundary", () => {
  it("recovers a stale retry and corrupt partial output without duplicate renditions", async () => {
    process.env.DEPLOY_ENV = "local";
    process.env.NEXT_PUBLIC_SUPABASE_URL = local!.API_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = local!.PUBLISHABLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = local!.SERVICE_ROLE_KEY;
    process.env.PAYMENT_PROVIDER_MODE = "disabled";
    process.env.EMAIL_PROVIDER_MODE = "disabled";
    process.env.ASSISTANCE_PROVIDER_MODE = "disabled";
    process.env.ANALYTICS_PROVIDER_MODE = "disabled";
    process.env.MONITORING_PROVIDER_MODE = "disabled";

    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const anonymous = createClient<Database>(local!.API_URL, local!.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const image = await sharp({
      create: { width: 320, height: 400, channels: 3, background: "#456274" },
    })
      .jpeg({ quality: 88 })
      .toBuffer();
    const { data: batch, error: batchError } = await service.rpc(
      "create_ingestion_batch",
      {
        p_title: `Integration media ${crypto.randomUUID()}`,
        p_expected_file_count: 1,
      },
    );
    expect(batchError).toBeNull();
    expect(batch?.product_id).toBeTruthy();
    const { data: file, error: fileError } = await service.rpc(
      "register_ingestion_file",
      {
        p_batch_id: batch!.id,
        p_client_file_id: `integration-${crypto.randomUUID()}`,
        p_original_filename: "integration.jpg",
        p_expected_mime: "image/jpeg",
        p_expected_byte_size: image.byteLength,
        p_recipe_version: 1,
      },
    );
    expect(fileError).toBeNull();
    const { error: uploadError } = await service.storage
      .from("product-originals")
      .upload(file!.storage_path, image, {
        contentType: "image/jpeg",
        upsert: false,
      });
    expect(uploadError).toBeNull();
    const duplicatePathUpload = await service.storage
      .from("product-originals")
      .upload(file!.storage_path, image, {
        contentType: "image/jpeg",
        upsert: false,
      });
    expect(duplicatePathUpload.error).not.toBeNull();
    const { error: stateError } = await service
      .from("ingestion_files")
      .update({ status: "uploaded" })
      .eq("id", file!.id);
    expect(stateError).toBeNull();

    const privateRead = await anonymous.storage
      .from("product-originals")
      .download(file!.storage_path);
    expect(privateRead.error).not.toBeNull();

    const checksumSha256 = createHash("sha256").update(image).digest("hex");
    const { data: inspectedFile, error: inspectionError } = await service.rpc(
      "complete_ingestion_upload",
      {
        p_file_id: file!.id,
        p_actual_mime: "image/jpeg",
        p_actual_byte_size: image.byteLength,
        p_actual_checksum_sha256: checksumSha256,
        p_pixel_width: 320,
        p_pixel_height: 400,
        p_orientation: 1,
      },
    );
    expect(inspectionError).toBeNull();
    const assetId = inspectedFile!.media_asset_id!;
    const firstRecipe = PRODUCT_RENDITIONS[0];
    const partialPath = renditionStoragePath({
      assetId,
      recipeVersion: 1,
      role: firstRecipe.role,
      width: firstRecipe.width,
      format: firstRecipe.format,
    });
    const corruptPartial = Buffer.from("incomplete-rendition");
    expect(
      (
        await service.storage
          .from("product-renditions")
          .upload(partialPath, corruptPartial, {
            contentType: "image/webp",
            upsert: false,
          })
      ).error,
    ).toBeNull();
    const { data: queuedJob } = await service
      .from("media_jobs")
      .select("id")
      .eq("subject_id", file!.id)
      .single();
    const { error: staleUpdateError } = await service
      .from("media_jobs")
      .update({
        status: "processing",
        lease_owner: "expired-worker",
        lease_expires_at: "2000-01-01T00:00:00.000Z",
      })
      .eq("id", queuedJob!.id);
    expect(staleUpdateError).toBeNull();
    expect(
      (
        await service.storage
          .from("product-originals")
          .remove([file!.storage_path])
      ).error,
    ).toBeNull();

    const { processIngestionWork } = await import("@/features/media/worker");
    const failedPass = await processIngestionWork({
      timeBudgetMs: 30_000,
      maxInspections: 1,
      maxJobs: 1,
    });
    expect(failedPass).toMatchObject({
      inspected: 0,
      claimed: 1,
      completed: 0,
      retrying: 1,
    });
    expect(
      (
        await service.storage
          .from("product-originals")
          .upload(file!.storage_path, image, {
            contentType: "image/jpeg",
            upsert: false,
          })
      ).error,
    ).toBeNull();
    const { error: retryScheduleError } = await service
      .from("media_jobs")
      .update({ next_attempt_at: "2000-01-01T00:00:00.000Z" })
      .eq("id", queuedJob!.id);
    expect(retryScheduleError).toBeNull();
    const processed = await processIngestionWork({
      timeBudgetMs: 30_000,
      maxInspections: 1,
      maxJobs: 1,
    });
    expect(processed).toMatchObject({ inspected: 0, claimed: 1, completed: 1 });
    const { data: readyFile, error: readyError } = await service
      .from("ingestion_files")
      .select("status,media_asset_id")
      .eq("id", file!.id)
      .single();
    expect(readyError).toBeNull();
    expect(readyFile?.status).toBe("ready");
    const { data: variants, error: variantError } = await service
      .from("media_variants")
      .select("path,status,checksum_sha256")
      .eq("asset_id", readyFile!.media_asset_id!);
    expect(variantError).toBeNull();
    expect(variants).toHaveLength(9);
    expect(new Set(variants!.map((variant) => variant.path)).size).toBe(9);
    const { data: recoveredPartial, error: recoveredPartialError } =
      await service.storage.from("product-renditions").download(partialPath);
    expect(recoveredPartialError).toBeNull();
    const recoveredBuffer = Buffer.from(await recoveredPartial!.arrayBuffer());
    expect(recoveredBuffer.equals(corruptPartial)).toBe(false);
    expect(createHash("sha256").update(recoveredBuffer).digest("hex")).toBe(
      variants!.find((variant) => variant.path === partialPath)!
        .checksum_sha256,
    );
    expect(
      (
        await service
          .from("media_jobs")
          .update({ status: "failed", attempt: 3 })
          .eq("id", queuedJob!.id)
      ).error,
    ).toBeNull();
    expect(
      (
        await service
          .from("ingestion_files")
          .update({ status: "failed" })
          .eq("id", file!.id)
      ).error,
    ).toBeNull();
    const { data: manualRetry, error: manualRetryError } = await service.rpc(
      "retry_ingestion_file",
      { p_file_id: file!.id },
    );
    expect(manualRetryError).toBeNull();
    expect(manualRetry).toMatchObject({ status: "retrying", attempt: 0 });
    const manualRetryPass = await processIngestionWork({
      timeBudgetMs: 30_000,
      maxInspections: 1,
      maxJobs: 1,
    });
    expect(manualRetryPass).toMatchObject({
      inspected: 0,
      claimed: 1,
      completed: 1,
    });
    expect(
      (
        await service
          .from("media_variants")
          .select("id", { count: "exact", head: true })
          .eq("asset_id", readyFile!.media_asset_id!)
      ).count,
    ).toBe(9);
    const secondPass = await processIngestionWork({
      timeBudgetMs: 5_000,
      maxInspections: 1,
      maxJobs: 1,
    });
    expect(secondPass).toMatchObject({
      inspected: 0,
      claimed: 0,
      completed: 0,
    });

    const { data: asset } = await service
      .from("media_assets")
      .select("version")
      .eq("id", readyFile!.media_asset_id!)
      .single();
    const { error: approvalError } = await service.rpc(
      "approve_ingestion_media",
      {
        p_file_id: file!.id,
        p_expected_asset_version: asset!.version,
        p_alt_text: "Integration test carpet image",
        p_focal_x: 0.5,
        p_focal_y: 0.5,
        p_ownership_basis: "owned",
        p_creator_source: "Synthetic integration fixture",
      },
    );
    expect(approvalError).toBeNull();
    const publicRead = await anonymous.storage
      .from("product-renditions")
      .download(variants![0].path);
    expect(publicRead.error).toBeNull();

    const renditionPaths = variants!.map((variant) => variant.path);
    expect(
      (await service.storage.from("product-renditions").remove(renditionPaths))
        .error,
    ).toBeNull();
    expect(
      (
        await service.storage
          .from("product-originals")
          .remove([file!.storage_path])
      ).error,
    ).toBeNull();
    expect(
      (
        await service
          .from("media_links")
          .delete()
          .eq("entity_type", "product")
          .eq("entity_id", batch!.product_id!)
      ).error,
    ).toBeNull();
    expect(
      (await service.from("ingestion_batches").delete().eq("id", batch!.id))
        .error,
    ).toBeNull();
    expect(
      (
        await service
          .from("media_assets")
          .delete()
          .eq("id", readyFile!.media_asset_id!)
      ).error,
    ).toBeNull();
    expect(
      (await service.from("products").delete().eq("id", batch!.product_id!))
        .error,
    ).toBeNull();
  }, 45_000);

  it("lets the owning manager remove a cancelled private orphan", async () => {
    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const manager = createClient<Database>(
      local!.API_URL,
      local!.PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const unique = crypto.randomUUID().slice(0, 8);
    const email = `orphan-${unique}@epoca.test`;
    const password = "Integration-Orphan-Password-2026!";
    const { data: created, error: authError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    expect(authError).toBeNull();
    const userId = created.user!.id;
    expect(
      (
        await service.from("profiles").insert({
          id: userId,
          profile_kind: "staff",
          display_name: "Orphan Test Manager",
          locale: "en",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.from("staff_members").insert({
          profile_id: userId,
          role: "manager",
          active: true,
          mfa_required: false,
          activated_at: new Date().toISOString(),
        })
      ).error,
    ).toBeNull();
    expect(
      (await manager.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();

    let batchId: string | undefined;
    let productId: string | undefined;
    let originalPath: string | undefined;
    try {
      const { data: batch, error: batchError } = await manager.rpc(
        "create_ingestion_batch",
        { p_title: `Orphan cleanup ${unique}`, p_expected_file_count: 1 },
      );
      expect(batchError).toBeNull();
      batchId = batch!.id;
      productId = batch!.product_id ?? undefined;
      const orphan = await sharp({
        create: { width: 80, height: 100, channels: 3, background: "#584332" },
      })
        .jpeg()
        .toBuffer();
      const { data: file, error: fileError } = await manager.rpc(
        "register_ingestion_file",
        {
          p_batch_id: batch!.id,
          p_client_file_id: `orphan-${unique}`,
          p_original_filename: "orphan.jpg",
          p_expected_mime: "image/jpeg",
          p_expected_byte_size: orphan.byteLength,
          p_recipe_version: 1,
        },
      );
      expect(fileError).toBeNull();
      originalPath = file!.storage_path;
      expect(
        (
          await manager.storage
            .from("product-originals")
            .upload(originalPath, orphan, {
              contentType: "image/jpeg",
              upsert: false,
            })
        ).error,
      ).toBeNull();
      expect(
        (await manager.rpc("cancel_ingestion_batch", { p_batch_id: batch!.id }))
          .error,
      ).toBeNull();
      expect(
        (await manager.storage.from("product-originals").remove([originalPath]))
          .error,
      ).toBeNull();
      expect(
        (await manager.storage.from("product-originals").download(originalPath))
          .error,
      ).not.toBeNull();
    } finally {
      if (batchId) {
        await service.from("ingestion_batches").delete().eq("id", batchId);
      }
      if (productId) {
        await service.from("products").delete().eq("id", productId);
      }
      await service.auth.admin.deleteUser(userId);
    }
  }, 30_000);
});
