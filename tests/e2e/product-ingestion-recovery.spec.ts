import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

import type { Database } from "@/lib/supabase/database.types";

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

test("recovers an interrupted upload and identifies a duplicate safely", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns this stateful recovery journey.",
  );
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const unique = randomUUID().slice(0, 8);
  const email = `ingestion-recovery-${unique}@epoca.test`;
  const password = "E2e-Recovery-Password-2026!";
  const { data: created, error: authError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError) throw authError;
  const userId = created.user.id;
  const { error: profileError } = await service.from("profiles").insert({
    id: userId,
    profile_kind: "staff",
    display_name: "Recovery Manager",
    locale: "en",
  });
  if (profileError) throw profileError;
  const { error: staffError } = await service.from("staff_members").insert({
    profile_id: userId,
    role: "manager",
    active: true,
    mfa_required: false,
    activated_at: new Date().toISOString(),
  });
  if (staffError) throw staffError;

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "epoca-recovery-"));
  const imagePath = join(temporaryDirectory, "large-rug.jpg");
  const width = 2800;
  const height = 2800;
  const source = randomBytes(width * height * 3);
  await sharp(source, {
    raw: { width, height, channels: 3 },
  })
    .jpeg({ quality: 98, chromaSubsampling: "4:4:4" })
    .toFile(imagePath);
  const image = await readFile(imagePath);
  expect(image.byteLength).toBeGreaterThan(6 * 1024 * 1024);

  let primaryBatchId: string | undefined;
  let primaryProductId: string | undefined;
  let duplicateBatchId: string | undefined;
  let duplicateProductId: string | undefined;
  let assetId: string | undefined;
  const originalPaths: string[] = [];

  try {
    await page.goto("/en/admin/ingestion");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/ingestion$/);
    await page.getByLabel("Batch title").fill(`Recovery ${unique}`);
    await page.getByLabel("Expected photos").fill("1");
    await page.getByRole("button", { name: "Create batch" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/ingestion\/[a-f0-9-]+$/);
    primaryBatchId = new URL(page.url()).pathname.split("/").at(-1);
    if (!primaryBatchId) throw new Error("RECOVERY_BATCH_MISSING");
    const { data: primaryBatch } = await service
      .from("ingestion_batches")
      .select("product_id")
      .eq("id", primaryBatchId)
      .single();
    primaryProductId = primaryBatch?.product_id ?? undefined;

    let interrupted = false;
    await page.route("**/storage/v1/upload/resumable/**", async (route) => {
      if (!interrupted && route.request().method() === "PATCH") {
        interrupted = true;
        await route.abort("internetdisconnected");
        return;
      }
      await route.continue();
    });
    await page
      .locator("input.uppy-Dashboard-input")
      .first()
      .setInputFiles(imagePath);
    const uploadButton = page.getByRole("button", {
      name: "Upload authorized files",
    });
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();
    await expect
      .poll(async () => {
        const { data: file } = await service
          .from("ingestion_files")
          .select("status")
          .eq("batch_id", primaryBatchId!)
          .single();
        return file?.status;
      })
      .toBe("uploaded");
    expect(interrupted).toBe(true);
    await page.unroute("**/storage/v1/upload/resumable/**");

    const { data: primaryFile, error: primaryFileError } = await service
      .from("ingestion_files")
      .select("id,storage_path")
      .eq("batch_id", primaryBatchId)
      .single();
    if (primaryFileError) throw primaryFileError;
    originalPaths.push(primaryFile.storage_path);
    const checksum = createHash("sha256").update(image).digest("hex");
    const { data: completed, error: completionError } = await service.rpc(
      "complete_ingestion_upload",
      {
        p_file_id: primaryFile.id,
        p_actual_mime: "image/jpeg",
        p_actual_byte_size: image.byteLength,
        p_actual_checksum_sha256: checksum,
        p_pixel_width: width,
        p_pixel_height: height,
        p_orientation: 1,
      },
    );
    if (completionError) throw completionError;
    assetId = completed.media_asset_id ?? undefined;

    await page.reload();
    await expect(page.getByText("uploaded", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Review product" }).click();
    await expect(
      page
        .getByText(
          "AI assistance is safely disabled; enter and review copy manually.",
        )
        .first(),
    ).toBeVisible();
    await expect(
      page.getByText("Verified dimensions are required."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Georgian, English, German, and Russian copy must all be reviewed.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Publish product" }),
    ).toHaveCount(0);

    const { data: duplicateBatch, error: duplicateBatchError } =
      await service.rpc("create_ingestion_batch", {
        p_title: `Duplicate ${unique}`,
        p_expected_file_count: 1,
      });
    if (duplicateBatchError) throw duplicateBatchError;
    duplicateBatchId = duplicateBatch.id;
    duplicateProductId = duplicateBatch.product_id ?? undefined;
    const { data: duplicateFile, error: duplicateFileError } =
      await service.rpc("register_ingestion_file", {
        p_batch_id: duplicateBatch.id,
        p_client_file_id: `duplicate-${unique}`,
        p_original_filename: "duplicate-rug.jpg",
        p_expected_mime: "image/jpeg",
        p_expected_byte_size: image.byteLength,
        p_expected_checksum_sha256: checksum,
        p_recipe_version: 1,
      });
    if (duplicateFileError) throw duplicateFileError;
    originalPaths.push(duplicateFile.storage_path);
    const { error: duplicateUploadError } = await service.storage
      .from("product-originals")
      .upload(duplicateFile.storage_path, image, {
        contentType: "image/jpeg",
        upsert: false,
      });
    if (duplicateUploadError) throw duplicateUploadError;
    const { data: duplicateResult, error: duplicateCompletionError } =
      await service.rpc("complete_ingestion_upload", {
        p_file_id: duplicateFile.id,
        p_actual_mime: "image/jpeg",
        p_actual_byte_size: image.byteLength,
        p_actual_checksum_sha256: checksum,
        p_pixel_width: width,
        p_pixel_height: height,
        p_orientation: 1,
      });
    if (duplicateCompletionError) throw duplicateCompletionError;
    expect(duplicateResult.status).toBe("duplicate");
    await page.goto(`/en/admin/ingestion/${duplicateBatch.id}`);
    await expect(page.getByText("duplicate", { exact: true })).toBeVisible();
  } finally {
    if (originalPaths.length > 0) {
      await service.storage.from("product-originals").remove(originalPaths);
    }
    for (const batchId of [duplicateBatchId, primaryBatchId]) {
      if (batchId) {
        await service.from("ingestion_batches").delete().eq("id", batchId);
      }
    }
    if (assetId) {
      await service.from("media_assets").delete().eq("id", assetId);
    }
    for (const productId of [duplicateProductId, primaryProductId]) {
      if (productId) {
        await service.from("products").delete().eq("id", productId);
      }
    }
    await service.from("staff_members").delete().eq("profile_id", userId);
    await service.auth.admin.deleteUser(userId);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
