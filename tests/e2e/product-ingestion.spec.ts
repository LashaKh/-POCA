import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

async function finishLocalMediaProcessing(
  service: SupabaseClient<Database>,
  fileId: string,
) {
  const { data: file, error: fileError } = await service
    .from("ingestion_files")
    .select("*")
    .eq("id", fileId)
    .single();
  if (fileError) throw fileError;
  const { data: blob, error: downloadError } = await service.storage
    .from(file.storage_bucket)
    .download(file.storage_path);
  if (downloadError) throw downloadError;
  const input = Buffer.from(await blob.arrayBuffer());
  const metadata = await sharp(input).metadata();
  const checksum = createHash("sha256").update(input).digest("hex");
  const { data: completedFile, error: completionError } = await service.rpc(
    "complete_ingestion_upload",
    {
      p_file_id: file.id,
      p_actual_mime: "image/jpeg",
      p_actual_byte_size: input.byteLength,
      p_actual_checksum_sha256: checksum,
      p_pixel_width: metadata.width!,
      p_pixel_height: metadata.height!,
      p_orientation: metadata.orientation ?? 1,
    },
  );
  if (completionError) throw completionError;
  const workerId = `e2e-${crypto.randomUUID()}`;
  const { data: jobs, error: claimError } = await service.rpc(
    "claim_ingestion_jobs",
    { p_worker_id: workerId, p_claim_limit: 1, p_lease_seconds: 300 },
  );
  if (claimError) throw claimError;
  const job = jobs.find((candidate) => candidate.subject_id === file.id);
  if (!job || !completedFile.media_asset_id)
    throw new Error("E2E_MEDIA_JOB_MISSING");
  const recipes = [
    {
      role: "card_4x5" as const,
      width: 480,
      height: 600,
      format: "webp" as const,
    },
    {
      role: "gallery_3x4" as const,
      width: 600,
      height: 800,
      format: "webp" as const,
    },
    { role: "og" as const, width: 1200, height: 630, format: "jpeg" as const },
  ];
  const paths: string[] = [];
  for (const recipe of recipes) {
    const output =
      recipe.format === "jpeg"
        ? await sharp(input)
            .rotate()
            .resize(recipe.width, recipe.height, { fit: "cover" })
            .jpeg({ quality: 85 })
            .toBuffer()
        : await sharp(input)
            .rotate()
            .resize(recipe.width, recipe.height, { fit: "cover" })
            .webp({ quality: 84 })
            .toBuffer();
    const path = `${completedFile.media_asset_id}/v1/${recipe.role}-${recipe.width}.${recipe.format}`;
    const { error: uploadError } = await service.storage
      .from("product-renditions")
      .upload(path, output, {
        contentType: recipe.format === "jpeg" ? "image/jpeg" : "image/webp",
        upsert: false,
      });
    if (uploadError) throw uploadError;
    paths.push(path);
    const { error: variantError } = await service
      .from("media_variants")
      .insert({
        asset_id: completedFile.media_asset_id,
        recipe_version: 1,
        role: recipe.role,
        format: recipe.format,
        width: recipe.width,
        height: recipe.height,
        crop_x: 0,
        crop_y: 0,
        focal_x: 0.5,
        focal_y: 0.5,
        path,
        checksum_sha256: createHash("sha256").update(output).digest("hex"),
        byte_size: output.byteLength,
        status: "processing",
      });
    if (variantError) throw variantError;
  }
  const { error: jobError } = await service.rpc("complete_ingestion_job", {
    p_job_id: job.id,
    p_worker_id: workerId,
  });
  if (jobError) throw jobError;
  return {
    assetId: completedFile.media_asset_id,
    originalPath: file.storage_path,
    renditionPaths: paths,
  };
}

test("manager uploads, reviews, and publishes one truthful product", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One project owns the stateful ingestion publication journey.",
  );
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const unique = crypto.randomUUID().slice(0, 8);
  const email = `ingestion-${unique}@epoca.test`;
  const password = "E2e-Ingestion-Password-2026!";
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
    display_name: "Ingestion Manager",
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
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "epoca-ingestion-"));
  const imagePath = join(temporaryDirectory, "collector-rug.jpg");
  await sharp({
    create: {
      width: 800,
      height: 1000,
      channels: 3,
      background: "#385b6c",
    },
  })
    .jpeg({ quality: 90 })
    .toFile(imagePath);
  let batchId: string | undefined;
  let productId: string | undefined;
  let media:
    | { assetId: string; originalPath: string; renditionPaths: string[] }
    | undefined;

  try {
    await page.goto("/en/admin/ingestion");
    await expect(page).toHaveURL(/\/en\/auth\/sign-in/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/ingestion$/);
    await page.getByLabel("Batch title").fill(`Collector E2E ${unique}`);
    await page.getByLabel("Expected photos").fill("1");
    await page.getByRole("button", { name: "Create batch" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/ingestion\/[a-f0-9-]+$/);
    batchId = page.url().split("/").at(-1);
    if (!batchId) throw new Error("Batch route did not contain an id.");
    const { data: batch } = await service
      .from("ingestion_batches")
      .select("product_id")
      .eq("id", batchId)
      .single();
    productId = batch?.product_id ?? undefined;
    if (!productId) throw new Error("Batch did not create a draft product.");

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
          .select("id,status")
          .eq("batch_id", batchId!)
          .maybeSingle();
        return file;
      })
      .toMatchObject({ status: "uploaded" });
    const { data: uploadedFile } = await service
      .from("ingestion_files")
      .select("id")
      .eq("batch_id", batchId)
      .single();
    media = await finishLocalMediaProcessing(service, uploadedFile!.id);

    await page.reload();
    await expect(page.getByText("ready", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Review product" }).click();
    await page.getByLabel("Width (mm)").fill("1600");
    await page.getByLabel("Length (mm)").fill("2400");
    await page.getByLabel("Materials (comma separated)").fill("wool");
    await page.getByLabel("Construction").fill("hand-knotted");
    await page.getByLabel("Colors (comma separated)").fill("indigo, ivory");
    await page.getByLabel("Styles (comma separated)").fill("traditional");
    await page.getByLabel("Condition").fill("excellent");
    await page.getByLabel("Price (GEL)").fill("4250.00");
    for (const locale of ["ka", "en", "de", "ru"] as const) {
      const editor = page.locator(`details:has(input[name="${locale}.name"])`);
      if ((await editor.getAttribute("open")) === null) {
        await editor.locator("summary").click();
      }
      await page
        .locator(`[name="${locale}.name"]`)
        .fill(`Collector Rug ${locale.toUpperCase()}`);
      await page
        .locator(`[name="${locale}.shortDescription"]`)
        .fill("Reviewed product description.");
      await page
        .locator(`[name="${locale}.longDescription"]`)
        .fill(
          "A complete human-reviewed description for the publication journey.",
        );
    }
    await page.getByRole("button", { name: "Save reviewed record" }).click();
    await expect(page.getByText("Review saved.")).toBeVisible();
    await page
      .getByLabel("Reviewed image description")
      .fill("Indigo rectangular carpet photographed from above");
    await page
      .getByRole("button", { name: "Approve rights and crops" })
      .click();
    await expect(
      page.getByText("All authoritative checks pass."),
    ).toBeVisible();
    await page
      .getByLabel(
        "I confirm the current facts, translations, price, stock, media rights, and crops are correct.",
      )
      .check();
    await page.getByRole("button", { name: "Publish product" }).click();
    await expect(page).toHaveURL(/\/en\/products\/epo-[a-z0-9-]+-en$/);
    await expect(
      page.getByRole("heading", { name: "Collector Rug EN" }),
    ).toBeVisible();
    await expect(page.getByText("GEL 4,250.00")).toBeVisible();
  } finally {
    if (media) {
      await service.storage
        .from("product-renditions")
        .remove(media.renditionPaths);
      await service.storage
        .from("product-originals")
        .remove([media.originalPath]);
      await service.from("media_links").delete().eq("asset_id", media.assetId);
    }
    if (batchId) {
      await service.from("ingestion_batches").delete().eq("id", batchId);
    }
    if (media) {
      await service.from("media_assets").delete().eq("id", media.assetId);
    }
    if (productId) {
      await service
        .from("inventory_items")
        .delete()
        .eq("product_id", productId);
      await service.from("product_prices").delete().eq("product_id", productId);
      await service
        .from("product_translations")
        .delete()
        .eq("product_id", productId);
      await service.from("products").delete().eq("id", productId);
    }
    await service.from("staff_members").delete().eq("profile_id", userId);
    await service.auth.admin.deleteUser(userId);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
