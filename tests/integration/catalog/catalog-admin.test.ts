import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

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

function productCommand(sku: string, name = "Catalog integration") {
  return {
    p_sku: sku,
    p_facts: {
      widthMm: 1700,
      lengthMm: 2400,
      shape: "rectangle",
      materials: ["wool"],
      construction: "hand-knotted",
      colors: ["blue"],
      styles: ["traditional"],
      condition: "excellent",
      careCode: "professional-clean",
      deliveryClass: "parcel",
      category: "carpet",
      origin: "Georgia",
      originVerified: true,
    },
    p_translations: [
      {
        locale: "ka",
        slug: `${sku.toLowerCase()}-ka`,
        name: `${name} KA`,
        status: "draft",
      },
      {
        locale: "en",
        slug: `${sku.toLowerCase()}-en`,
        name: `${name} EN`,
        status: "draft",
      },
      {
        locale: "de",
        slug: `${sku.toLowerCase()}-de`,
        name: `${name} DE`,
        status: "draft",
      },
      {
        locale: "ru",
        slug: `${sku.toLowerCase()}-ru`,
        name: `${name} RU`,
        status: "draft",
      },
    ],
    p_prices: [{ currency: "GEL", amountMinor: 125000, enabled: true }],
    p_stock_model: "stocked" as const,
    p_on_hand_quantity: 3,
    p_change_note: "Create integration product",
  };
}

describe.skipIf(!local)("local catalog administration boundary", () => {
  it("preserves conflicts, audit, partial bulk results, mixed imports, and private scoped exports", async () => {
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
    const marker = crypto.randomUUID().slice(0, 8);
    const email = `catalog-${marker}@epoca.test`;
    const password = `Catalog-${marker}-Safe-2026!`;
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;
    expect(
      (
        await service.from("profiles").upsert({
          id: userId,
          profile_kind: "staff",
          display_name: "Catalog integration manager",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await service.from("staff_members").upsert({
          profile_id: userId,
          role: "manager",
          active: true,
          mfa_required: false,
          activated_at: new Date().toISOString(),
        })
      ).error,
    ).toBeNull();
    const manager = createClient<Database>(local!.API_URL, local!.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (await manager.auth.signInWithPassword({ email, password })).error,
    ).toBeNull();

    const sku = `INT-${marker}`;
    const createdProduct = await manager.rpc(
      "save_catalog_product",
      productCommand(sku),
    );
    expect(createdProduct.error).toBeNull();
    expect(createdProduct.data?.version).toBe(1);
    const productId = createdProduct.data!.id;

    const firstEdit = await manager.rpc("save_catalog_product", {
      ...productCommand(sku, "Catalog revised"),
      p_product_id: productId,
      p_expected_version: 1,
      p_change_note: "First manager edit",
    });
    expect(firstEdit.error).toBeNull();
    expect(firstEdit.data?.version).toBe(2);
    const staleEdit = await manager.rpc("save_catalog_product", {
      ...productCommand(sku, "Stale edit"),
      p_product_id: productId,
      p_expected_version: 1,
      p_change_note: "Stale manager edit",
    });
    expect(staleEdit.error?.message).toContain("VERSION_CONFLICT");

    const inventory = await manager
      .from("inventory_items")
      .select("version,on_hand_quantity")
      .eq("product_id", productId)
      .single();
    const adjustmentKey = `catalog-adjust-${crypto.randomUUID()}`;
    const adjustment = await manager.rpc("adjust_catalog_inventory", {
      p_product_id: productId,
      p_expected_inventory_version: inventory.data!.version,
      p_quantity_delta: 2,
      p_reason: "Integration stock count",
      p_idempotency_key: adjustmentKey,
    });
    expect(adjustment.error).toBeNull();
    expect(adjustment.data?.on_hand_quantity).toBe(5);
    const replay = await manager.rpc("adjust_catalog_inventory", {
      p_product_id: productId,
      p_expected_inventory_version: inventory.data!.version,
      p_quantity_delta: 2,
      p_reason: "Integration stock count",
      p_idempotency_key: adjustmentKey,
    });
    expect(replay.data?.on_hand_quantity).toBe(5);

    const archiveKey = `catalog-archive-${crypto.randomUUID()}`;
    const archived = await manager.rpc("bulk_catalog_action", {
      p_product_ids: [productId, "80000000-0000-4000-8000-000000000099"],
      p_action: "archive",
      p_reason: "Integration reversible archive",
      p_idempotency_key: archiveKey,
    });
    expect(archived.error).toBeNull();
    expect(archived.data).toMatchObject({
      succeeded: [{ productId }],
      failed: [{ productId: "80000000-0000-4000-8000-000000000099" }],
    });
    const restored = await manager.rpc("bulk_catalog_action", {
      p_product_ids: [productId],
      p_action: "restore",
      p_reason: "Integration restore",
      p_idempotency_key: `catalog-restore-${crypto.randomUUID()}`,
    });
    expect(restored.error).toBeNull();

    const importSku = `CSV-${marker}`;
    const normalized = productCommand(importSku, "Imported");
    const staged = await manager.rpc("stage_catalog_import", {
      p_source_path: `staff/${userId}/${marker}.csv`,
      p_source_checksum: marker.padEnd(64, "a"),
      p_original_filename: `${marker}.csv`,
      p_header_mapping: { sku: "sku" },
      p_rows: [
        {
          rowNumber: 2,
          source: { sku: importSku },
          normalized: {
            sku: normalized.p_sku,
            facts: normalized.p_facts,
            translations: normalized.p_translations,
            prices: normalized.p_prices,
            stockModel: normalized.p_stock_model,
            onHandQuantity: normalized.p_on_hand_quantity,
          },
          errors: [],
        },
        {
          rowNumber: 3,
          source: { sku: "=bad" },
          normalized: null,
          errors: [{ field: "sku", code: "INVALID_SKU" }],
        },
      ],
    });
    expect(staged.error).toBeNull();
    expect(staged.data).toMatchObject({
      valid_row_count: 1,
      invalid_row_count: 1,
    });
    const applied = await manager.rpc("apply_catalog_import", {
      p_batch_id: staged.data!.id,
    });
    expect(applied.error).toBeNull();
    expect(applied.data?.applied_row_count).toBe(1);

    const queue = await manager
      .from("staff_catalog_products")
      .select("missing_locales")
      .eq("id", productId)
      .single();
    expect(queue.data?.missing_locales).toEqual([]);
    const savedView = await manager.rpc("save_catalog_admin_view", {
      p_view_type: "products",
      p_name: `Complete ${marker}`,
      p_filters: { translation: "complete", stock: "available" },
      p_sort: { value: "updated-desc" },
    });
    expect(savedView.error).toBeNull();
    const ownedViews = await manager
      .from("saved_admin_views")
      .select("name,filters")
      .eq("view_type", "products");
    expect(ownedViews.data).toContainEqual(
      expect.objectContaining({ name: `Complete ${marker}` }),
    );
    const exportRequest = await manager.rpc("request_catalog_export", {
      p_scope: { status: "draft" },
      p_download_name: `epoca-${marker}.csv`,
    });
    expect(exportRequest.error).toBeNull();
    const { processCatalogExports } =
      await import("@/features/catalog/exporter");
    expect(await processCatalogExports(1)).toMatchObject({
      completed: 1,
      failed: 0,
    });
    const exportJob = await service
      .from("export_jobs")
      .select("status,object_path,row_count")
      .eq("id", exportRequest.data!.id)
      .single();
    expect(exportJob.data?.status).toBe("complete");
    expect(exportJob.data?.row_count).toBeGreaterThanOrEqual(4);
    const file = await service.storage
      .from("catalog-exports")
      .download(exportJob.data!.object_path!);
    expect(file.error).toBeNull();
    expect(await file.data!.text()).toContain(sku);

    const revisionCount = await manager
      .from("catalog_revisions")
      .select("id", { count: "exact", head: true })
      .eq("entity_id", productId);
    expect(revisionCount.count).toBeGreaterThanOrEqual(4);
  });
});
