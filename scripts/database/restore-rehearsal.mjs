import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const databaseContainer =
  process.env.EPOCA_DB_CONTAINER ?? "supabase_db_epoca-online-shop";
const restoreDatabase = `epoca_restore_${new Date()
  .toISOString()
  .slice(0, 10)
  .replaceAll("-", "")}_${randomUUID().replaceAll("-", "").slice(0, 8)}`;
const temporaryDirectory = mkdtempSync(join(tmpdir(), "epoca-restore-"));
const dumpPath = join(temporaryDirectory, "database.dump");
const supabaseBinary = resolve("node_modules/.bin/supabase");

if (!/^supabase_db_[A-Za-z0-9_.-]+$/.test(databaseContainer)) {
  throw new Error("INVALID_LOCAL_DATABASE_CONTAINER");
}
if (!/^epoca_restore_[a-z0-9_]+$/.test(restoreDatabase)) {
  throw new Error("INVALID_RESTORE_DATABASE_NAME");
}

function run(file, args, options = {}) {
  return execFileSync(file, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function docker(args, options) {
  return run("docker", ["exec", databaseContainer, ...args], options);
}

function parseLocalEnvironment() {
  const output = run(supabaseBinary, ["status", "-o", "env"]);
  const environment = Object.fromEntries(
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
  );
  const apiUrl = new URL(environment.API_URL);
  if (
    !["127.0.0.1", "localhost"].includes(apiUrl.hostname) ||
    !environment.SERVICE_ROLE_KEY
  ) {
    throw new Error("LOCAL_SUPABASE_REQUIRED");
  }
  return environment;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function createRecoveryScenario(service) {
  const marker = randomUUID().replaceAll("-", "").slice(0, 12);
  const productId = randomUUID();
  const assetId = randomUUID();
  const sourcePath = `rehearsal/${marker}/master.png`;
  const renditionPath = `rehearsal/${marker}/thumbnail-32.webp`;
  const fixtureColor = {
    r: Number.parseInt(marker.slice(0, 2), 16),
    g: Number.parseInt(marker.slice(2, 4), 16),
    b: Number.parseInt(marker.slice(4, 6), 16),
    alpha: 1,
  };
  const imageSource = sharp({
    create: {
      width: 32,
      height: 32,
      channels: 4,
      background: fixtureColor,
    },
  });
  const [originalImage, renditionImage] = await Promise.all([
    imageSource.clone().png().toBuffer(),
    imageSource.clone().webp().toBuffer(),
  ]);
  const originalChecksum = sha256(originalImage);
  const renditionChecksum = sha256(renditionImage);

  for (const object of [
    {
      bucket: "product-originals",
      path: sourcePath,
      contentType: "image/png",
      bytes: originalImage,
    },
    {
      bucket: "product-renditions",
      path: renditionPath,
      contentType: "image/webp",
      bytes: renditionImage,
    },
  ]) {
    const uploaded = await service.storage
      .from(object.bucket)
      .upload(object.path, object.bytes, {
        contentType: object.contentType,
        upsert: false,
      });
    if (uploaded.error) throw uploaded.error;
  }

  const product = await service.from("products").insert({
    id: productId,
    sku: `RESTORE-${marker.toUpperCase()}`,
    status: "published",
    readiness_passed: true,
    published_at: new Date().toISOString(),
    width_mm: 1800,
    length_mm: 2700,
    shape: "rectangle",
    materials: ["wool"],
    construction: "hand-knotted",
    colors: ["walnut"],
    styles: ["traditional"],
    condition: "excellent",
    care_code: "professional-clean",
    delivery_class: "parcel",
    search_visible: true,
    primary_media_asset_id: null,
  });
  if (product.error) throw product.error;

  const related = await Promise.all([
    service.from("product_translations").insert({
      product_id: productId,
      locale: "en",
      slug: `restore-rehearsal-${marker}`,
      name: "Restore rehearsal carpet",
      short_description: "Synthetic local recovery fixture.",
      long_description:
        "Synthetic local-only order and media graph used to prove backup recovery.",
      search_text: "restore rehearsal synthetic carpet",
      alt_text_ready: true,
      status: "published",
    }),
    service.from("product_prices").insert({
      product_id: productId,
      currency: "GEL",
      amount_minor: 175_000,
      enabled: true,
    }),
    service.from("inventory_items").insert({
      product_id: productId,
      stock_model: "unique",
      on_hand_quantity: 1,
    }),
    service.from("media_assets").insert({
      id: assetId,
      purpose: "product",
      original_bucket: "product-originals",
      original_path: sourcePath,
      checksum_sha256: originalChecksum,
      actual_mime: "image/png",
      byte_size: originalImage.byteLength,
      pixel_width: 32,
      pixel_height: 32,
      protected: true,
      approval_status: "approved",
    }),
  ]);
  for (const result of related) if (result.error) throw result.error;

  const mediaGraph = await Promise.all([
    service.from("media_licenses").insert({
      asset_id: assetId,
      ownership_basis: "generated",
      creator_source: "Repository restore rehearsal fixture",
      approved_at: new Date().toISOString(),
      status: "approved",
    }),
    service.from("media_variants").insert({
      asset_id: assetId,
      recipe_version: 1,
      role: "thumbnail",
      format: "webp",
      width: 32,
      height: 32,
      bucket: "product-renditions",
      path: renditionPath,
      checksum_sha256: renditionChecksum,
      byte_size: renditionImage.byteLength,
      status: "approved",
    }),
    service.from("media_links").insert({
      asset_id: assetId,
      entity_type: "product",
      entity_id: productId,
      purpose: "primary",
      position: 0,
      locale: "en",
      primary_link: true,
      alt_text: "Synthetic brown restore-rehearsal carpet swatch",
      approved_crop_version: 1,
    }),
  ]);
  for (const result of mediaGraph) if (result.error) throw result.error;
  const primary = await service
    .from("products")
    .update({ primary_media_asset_id: assetId })
    .eq("id", productId);
  if (primary.error) throw primary.error;

  const secretHash = sha256(`restore-guest:${marker}`);
  const guest = await service.rpc("create_guest_context", {
    p_secret_hash: secretHash,
    p_locale: "en",
    p_currency: "GEL",
  });
  if (guest.error) throw guest.error;
  const cart = await service.rpc("add_guest_cart_item", {
    p_secret_hash: secretHash,
    p_product_id: productId,
    p_quantity: 1,
  });
  if (cart.error) throw cart.error;
  const reserved = await service.rpc("reserve_guest_checkout", {
    p_secret_hash: secretHash,
    p_country_code: "GE",
    p_method_code: "standard-test",
  });
  if (reserved.error) throw reserved.error;
  const checkoutQuote = await service
    .from("delivery_quotes")
    .select("total_minor")
    .eq("id", reserved.data.quote_id)
    .single();
  if (checkoutQuote.error) throw checkoutQuote.error;
  const accepted = await service.rpc("accept_guest_order", {
    p_secret_hash: secretHash,
    p_checkout_session_id: reserved.data.id,
    p_expected_total_minor: checkoutQuote.data.total_minor,
    p_accept_changes: false,
    p_idempotency_key_hash: sha256(`restore-idempotency:${marker}`),
    p_request_hash: sha256(`restore-request:${marker}`),
    p_guest_proof_hash: sha256(`restore-proof:${marker}`),
    p_contact_email: `restore-${marker}@example.test`,
    p_contact_phone: "",
    p_address: {
      fullName: "Synthetic Restore Buyer",
      line1: "1 Recovery Test Street",
      city: "Tbilisi",
      countryCode: "GE",
    },
    p_payment_method: "bank_transfer",
    p_terms_version: "terms-local-rehearsal-v1",
  });
  if (accepted.error) throw accepted.error;

  return {
    orderId: accepted.data.id,
    productId,
    assetId,
    storageObjects: [
      { bucket: "product-originals", path: sourcePath },
      { bucket: "product-renditions", path: renditionPath },
    ],
  };
}

async function captureStorageManifest(service, objects) {
  const manifest = [];
  for (const object of objects) {
    const downloaded = await service.storage
      .from(object.bucket)
      .download(object.path);
    if (downloaded.error) throw downloaded.error;
    const bytes = Buffer.from(await downloaded.data.arrayBuffer());
    const archivePath = join(
      temporaryDirectory,
      `${object.bucket}-${object.path.replaceAll("/", "-")}`,
    );
    writeFileSync(archivePath, bytes);
    manifest.push({
      ...object,
      byteSize: bytes.byteLength,
      sha256: sha256(bytes),
      archived: readFileSync(archivePath).equals(bytes),
    });
  }
  return manifest;
}

const countsSql = `
select jsonb_build_object(
  'migrations', (select count(*) from supabase_migrations.schema_migrations),
  'profiles', (select count(*) from public.profiles),
  'staff_members', (select count(*) from public.staff_members),
  'products', (select count(*) from public.products),
  'product_translations', (select count(*) from public.product_translations),
  'product_prices', (select count(*) from public.product_prices),
  'inventory_items', (select count(*) from public.inventory_items),
  'media_assets', (select count(*) from public.media_assets),
  'media_licenses', (select count(*) from public.media_licenses),
  'media_variants', (select count(*) from public.media_variants),
  'media_links', (select count(*) from public.media_links),
  'storage_objects', (select count(*) from storage.objects),
  'orders', (select count(*) from public.orders),
  'order_lines', (select count(*) from public.order_lines),
  'order_addresses', (select count(*) from public.order_addresses),
  'order_events', (select count(*) from public.order_events),
  'payment_attempts', (select count(*) from public.payment_attempts),
  'inventory_reservations', (select count(*) from public.inventory_reservations),
  'inventory_events', (select count(*) from public.inventory_events),
  'scheduled_actions', (select count(*) from public.scheduled_actions),
  'release_records', (select count(*) from public.release_records)
)::text;
`;

const rlsSql = `
select jsonb_build_object(
  'public_table_count', count(*),
  'rls_disabled', count(*) filter (where not relrowsecurity),
  'forced_rls_disabled', count(*) filter (where relrowsecurity and not relforcerowsecurity),
  'critical', jsonb_agg(
    jsonb_build_object('table', relname, 'rls', relrowsecurity, 'forced', relforcerowsecurity)
    order by relname
  ) filter (where relname = any(array[
    'audit_events', 'inventory_items', 'media_assets', 'media_links',
    'order_lines', 'orders', 'staff_members'
  ]))
)::text
from pg_catalog.pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';
`;

const invariantsSql = `
select jsonb_build_object(
  'orders_without_lines', (
    select count(*) from public.orders orders
    where not exists (select 1 from public.order_lines lines where lines.order_id = orders.id)
  ),
  'orders_without_delivery_address', (
    select count(*) from public.orders orders
    where not exists (
      select 1 from public.order_addresses address
      where address.order_id = orders.id and address.address_type = 'delivery'
    )
  ),
  'order_total_mismatches', (
    select count(*) from public.orders
    where total_minor <> subtotal_minor - discount_minor + tax_minor + delivery_minor
  ),
  'order_line_total_mismatches', (
    select count(*) from public.order_lines
    where subtotal_minor <> unit_amount_minor * quantity
      or total_minor <> subtotal_minor - discount_minor + tax_minor
  ),
  'inventory_invalid', (
    select count(*) from public.inventory_items
    where on_hand_quantity < 0 or reserved_quantity < 0
      or reserved_quantity > on_hand_quantity
  ),
  'reservation_orphans', (
    select count(*) from public.inventory_reservations reservation
    left join public.products product on product.id = reservation.product_id
    left join public.orders orders on orders.id = reservation.order_id
    where product.id is null
      or (reservation.order_id is not null and orders.id is null)
  ),
  'media_link_orphans', (
    select count(*) from public.media_links link
    left join public.media_assets asset on asset.id = link.asset_id
    left join public.products product
      on link.entity_type = 'product' and product.id = link.entity_id
    left join public.collections collection
      on link.entity_type = 'collection' and collection.id = link.entity_id
    where asset.id is null
      or (link.entity_type = 'product' and product.id is null)
      or (link.entity_type = 'collection' and collection.id is null)
  ),
  'media_variant_orphans', (
    select count(*) from public.media_variants variant
    left join public.media_assets asset on asset.id = variant.asset_id
    where asset.id is null
  )
)::text;
`;

function queryJson(database, sql) {
  return JSON.parse(
    docker([
      "psql",
      "-qAt",
      "-U",
      "supabase_admin",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ]),
  );
}

function captureDatabaseSnapshot(database) {
  const criticalIntegrity = queryJson(
    database,
    "set role service_role; select public.verify_critical_data_integrity()::text;",
  );
  return {
    counts: queryJson(database, countsSql),
    rls: queryJson(database, rlsSql),
    invariants: queryJson(database, invariantsSql),
    criticalIntegrity: {
      ok: criticalIntegrity.ok,
      checks: criticalIntegrity.checks,
    },
  };
}

function createBackup() {
  const result = spawnSync(
    "docker",
    [
      "exec",
      databaseContainer,
      "pg_dump",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-Fc",
      "--no-owner",
      "--no-privileges",
    ],
    { maxBuffer: 1024 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    throw new Error(`DATABASE_BACKUP_FAILED:${result.stderr.toString()}`);
  }
  writeFileSync(dumpPath, result.stdout);
  return { byteSize: result.stdout.byteLength, sha256: sha256(result.stdout) };
}

function restoreBackup() {
  docker([
    "psql",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `create database "${restoreDatabase}" template template0;`,
  ]);
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      databaseContainer,
      "pg_restore",
      "-U",
      "supabase_admin",
      "-d",
      restoreDatabase,
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
    ],
    {
      input: readFileSync(dumpPath),
      maxBuffer: 1024 * 1024 * 1024,
    },
  );
  if (result.status !== 0) {
    throw new Error(`DATABASE_RESTORE_FAILED:${result.stderr.toString()}`);
  }
}

function dropRestoreDatabase() {
  docker([
    "psql",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `drop database if exists "${restoreDatabase}" with (force);`,
  ]);
}

let restoreCreated = false;
const rehearsalStartedAt = new Date();
try {
  const environment = parseLocalEnvironment();
  const service = createClient(
    environment.API_URL,
    environment.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const scenario = await createRecoveryScenario(service);
  const storageManifest = await captureStorageManifest(
    service,
    scenario.storageObjects,
  );
  assert.equal(storageManifest.length, 2);
  assert.ok(storageManifest.every((object) => object.archived));

  const source = captureDatabaseSnapshot("postgres");
  assert.equal(source.criticalIntegrity.ok, true);
  assert.equal(source.invariants.orders_without_lines, 0);
  assert.equal(source.invariants.orders_without_delivery_address, 0);
  assert.equal(source.invariants.inventory_invalid, 0);
  assert.equal(source.invariants.media_link_orphans, 0);
  assert.equal(source.rls.rls_disabled, 0);

  const backupAsOf = new Date();
  const backup = createBackup();
  const restoreStartedAt = new Date();
  restoreBackup();
  restoreCreated = true;
  const restored = captureDatabaseSnapshot(restoreDatabase);
  assert.deepEqual(restored, source);
  assert.equal(restored.counts.orders >= 1, true);
  assert.equal(restored.counts.media_assets >= 2, true);
  assert.equal(restored.counts.storage_objects >= 2, true);
  assert.equal(restored.criticalIntegrity.ok, true);

  const completedAt = new Date();
  const rtoSeconds = Math.ceil(
    (completedAt.getTime() - restoreStartedAt.getTime()) / 1000,
  );
  const checks = {
    localOnly: true,
    databaseSnapshotExact: true,
    criticalIntegrity: true,
    publicRlsDisabled: restored.rls.rls_disabled,
    invariantFailures: Object.values(restored.invariants).reduce(
      (total, value) => total + Number(value),
      0,
    ),
    storageObjectCount: storageManifest.length,
    storageArchiveChecksumsMatch: storageManifest.every(
      (object) => object.archived,
    ),
    restoredOrderCount: restored.counts.orders,
    restoredProductCount: restored.counts.products,
  };
  const evidence = await service.from("backup_restore_evidence").insert({
    evidence_type: "restore",
    environment: "isolated-restore",
    status: "passed",
    backup_as_of: backupAsOf.toISOString(),
    started_at: rehearsalStartedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    rpo_seconds: 0,
    rto_seconds: rtoSeconds,
    checks,
    artifact_reference: "docs/quality/restore-rehearsal.md",
    correlation_id: randomUUID(),
  });
  if (evidence.error) throw evidence.error;

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "passed",
        scope: "local-isolated-logical-restore",
        startedAt: rehearsalStartedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        backupAsOf: backupAsOf.toISOString(),
        rpoSeconds: 0,
        rtoSeconds,
        restoreDatabase,
        backup,
        source,
        restored,
        storageManifest,
        scenario: {
          orderId: scenario.orderId,
          productId: scenario.productId,
          assetId: scenario.assetId,
        },
        productionPitrProven: false,
        productionStorageRestoreProven: false,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  if (restoreCreated) dropRestoreDatabase();
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
