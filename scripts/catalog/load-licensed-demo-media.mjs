import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const root = process.cwd();
const records = [
  {
    sku: "SYN-00001",
    file: "rug-dark.webp",
    creator: "Polina",
    source: "https://www.pexels.com/photo/dark-carpet-pattern-6786957/",
    titles: {
      en: "Demo Carpet 01 — Midnight Pattern",
      ka: "სადემონსტრაციო ხალიჩა 01 — მუქი ორნამენტი",
      de: "Demo-Teppich 01 — Dunkles Muster",
      ru: "Демонстрационный ковёр 01 — тёмный узор",
    },
  },
  {
    sku: "SYN-00002",
    file: "rug-red.webp",
    creator: "Normalbirisiydi",
    source: "https://www.pexels.com/photo/decorated-carpet-on-floor-15033614/",
    titles: {
      en: "Demo Carpet 02 — Oxblood Field",
      ka: "სადემონსტრაციო ხალიჩა 02 — შინდისფერი ველი",
      de: "Demo-Teppich 02 — Oxblood-Feld",
      ru: "Демонстрационный ковёр 02 — бордовое поле",
    },
  },
  {
    sku: "SYN-00003",
    file: "rug-handmade.webp",
    creator: "Âmine Sarıgül",
    source:
      "https://www.pexels.com/photo/traditional-handmade-carpet-26087963/",
    titles: {
      en: "Demo Carpet 03 — Ornament Study",
      ka: "სადემონსტრაციო ხალიჩა 03 — ორნამენტის ეტიუდი",
      de: "Demo-Teppich 03 — Ornamentstudie",
      ru: "Демонстрационный ковёр 03 — этюд орнамента",
    },
  },
  {
    sku: "SYN-00004",
    file: "rug-texture.webp",
    creator: "Berna",
    source:
      "https://www.pexels.com/photo/close-up-of-vintage-persian-carpet-texture-28513319/",
    titles: {
      en: "Demo Carpet 04 — Worn Geometry",
      ka: "სადემონსტრაციო ხალიჩა 04 — დაძველებული გეომეტრია",
      de: "Demo-Teppich 04 — Gealterte Geometrie",
      ru: "Демонстрационный ковёр 04 — состаренная геометрия",
    },
  },
  {
    sku: "SYN-00005",
    file: "rug-indigo.webp",
    creator: "Mahdi",
    source:
      "https://www.pexels.com/photo/close-up-of-blue-vintage-and-ornamented-mosaic-11676365/",
    titles: {
      en: "Demo Carpet 05 — Indigo Archive",
      ka: "სადემონსტრაციო ხალიჩა 05 — ინდიგოს არქივი",
      de: "Demo-Teppich 05 — Indigo-Archiv",
      ru: "Демонстрационный ковёр 05 — архив индиго",
    },
  },
];

const renditions = [
  { role: "card_4x5", width: 960, height: 1200, format: "webp" },
  { role: "gallery_3x4", width: 1200, height: 1600, format: "webp" },
  { role: "og", width: 1200, height: 630, format: "jpeg" },
];

function localEnvironment() {
  const output = execFileSync(
    path.resolve(root, "node_modules/.bin/supabase"),
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
  );
}

function targetEnvironment() {
  const managedUrl = process.env.EPOCA_SUPABASE_URL?.trim();
  const managedKey = process.env.EPOCA_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (managedUrl || managedKey) {
    if (!managedUrl || !managedKey) {
      throw new Error(
        "Managed demo loading requires both EPOCA_SUPABASE_URL and EPOCA_SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
    if (process.env.EPOCA_ALLOW_MANAGED_DEMO_MEDIA !== "true") {
      throw new Error(
        "Refusing managed writes without EPOCA_ALLOW_MANAGED_DEMO_MEDIA=true.",
      );
    }
    const apiUrl = new URL(managedUrl);
    if (apiUrl.hostname !== "ryppdiplsdfwaobzdrim.supabase.co") {
      throw new Error(
        "Managed demo loading is restricted to the confirmed ÉPOCA Supabase project.",
      );
    }
    return {
      API_URL: apiUrl.toString(),
      SERVICE_ROLE_KEY: managedKey,
      managed: true,
      label: "managed ÉPOCA preview",
    };
  }

  const environment = localEnvironment();
  const apiUrl = new URL(environment.API_URL ?? "");
  if (!["127.0.0.1", "localhost"].includes(apiUrl.hostname)) {
    throw new Error(
      "Refusing to load demonstration media outside local Supabase.",
    );
  }
  if (!environment.SERVICE_ROLE_KEY) {
    throw new Error("Local Supabase did not report a service role key.");
  }
  return {
    API_URL: apiUrl.toString(),
    SERVICE_ROLE_KEY: environment.SERVICE_ROLE_KEY,
    managed: false,
    label: "local Supabase",
  };
}

function checksum(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function cropOrigin(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  if (sourceAspect > targetAspect) {
    const normalizedWidth = targetAspect / sourceAspect;
    return { x: (1 - normalizedWidth) / 2, y: 0 };
  }
  const normalizedHeight = sourceAspect / targetAspect;
  return { x: 0, y: (1 - normalizedHeight) / 2 };
}

function localizedCopy(locale, title, creator) {
  const copy = {
    en: {
      short: "Licensed demonstration photograph for local interface testing.",
      long: `This is not ÉPOCA inventory and is not offered for sale. The demonstration photograph is by ${creator} via Pexels. Physical carpet facts are intentionally omitted because they have not been verified.`,
    },
    ka: {
      short:
        "ლიცენზირებული სადემონსტრაციო ფოტო ლოკალური ინტერფეისის ტესტირებისთვის.",
      long: `ეს არ არის ÉPOCA-ს მარაგი და გასაყიდად არ არის შეთავაზებული. სადემონსტრაციო ფოტო ეკუთვნის ${creator}-ს და აღებულია Pexels-იდან. ფიზიკური ხალიჩის დაუდასტურებელი მონაცემები განზრახ გამოტოვებულია.`,
    },
    de: {
      short: "Lizenziertes Demonstrationsfoto für lokale Oberflächentests.",
      long: `Dies ist kein ÉPOCA-Bestand und wird nicht zum Verkauf angeboten. Das Demonstrationsfoto stammt von ${creator} über Pexels. Ungeprüfte Angaben zum physischen Teppich werden bewusst nicht genannt.`,
    },
    ru: {
      short:
        "Лицензированное демонстрационное фото для локального тестирования.",
      long: `Это не товар из запасов ÉPOCA и он не предлагается к продаже. Демонстрационное фото предоставлено ${creator} через Pexels. Непроверенные сведения о физическом ковре намеренно не указаны.`,
    },
  }[locale];
  return {
    name: title,
    short_description: copy.short,
    long_description: copy.long,
    care_text: null,
    search_text: `${title} licensed demo carpet rug pexels`,
    seo_title: title.slice(0, 70),
    seo_description: copy.short.slice(0, 180),
    alt_text_ready: true,
    status: "published",
  };
}

async function requireData(promise, label) {
  const result = await promise;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

const environment = targetEnvironment();
const service = createClient(environment.API_URL, environment.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureManagedDemoCatalog() {
  if (!environment.managed) return;

  const collectionId = "21000000-0000-4000-8000-000000000001";
  const now = new Date().toISOString();
  await requireData(
    service.from("collections").upsert(
      {
        id: collectionId,
        code: "licensed-demo-collection",
        status: "published",
        published_at: now,
        order_strategy: "manual",
      },
      { onConflict: "id" },
    ),
    "Create managed demo collection",
  );

  const collectionNames = {
    ka: ["ლიცენზირებული დემო კოლექცია", "მხოლოდ ინტერფეისის დემონსტრაციისთვის."],
    en: ["Licensed Demo Collection", "For interface demonstration only."],
    de: ["Lizenzierte Demo-Kollektion", "Nur zur Demonstration der Oberfläche."],
    ru: ["Лицензированная демо-коллекция", "Только для демонстрации интерфейса."],
  };
  await requireData(
    service.from("collection_translations").upsert(
      Object.entries(collectionNames).map(([locale, [name, description]]) => ({
        collection_id: collectionId,
        locale,
        slug: "licensed-demo-collection",
        name,
        description,
        seo_title: name,
        seo_description: description,
        status: "published",
      })),
      { onConflict: "collection_id,locale" },
    ),
    "Translate managed demo collection",
  );

  const products = await requireData(
    service
      .from("products")
      .upsert(
        records.map((record) => ({
          sku: record.sku,
          status: "published",
          readiness_passed: true,
          published_at: now,
          materials: [],
          colors: [],
          styles: [],
          condition: "licensed-demo-only",
          delivery_class: "demo-only",
          provenance_summary: `Licensed demonstration photograph by ${record.creator} via Pexels; this is not physical-carpet provenance.`,
          provenance_verified: true,
          search_visible: true,
          structured_data_eligible: false,
        })),
        { onConflict: "sku" },
      )
      .select("id,sku"),
    "Create managed demo products",
  );

  const productBySku = new Map(products.map((product) => [product.sku, product]));
  await requireData(
    service.from("product_translations").upsert(
      records.flatMap((record) => {
        const product = productBySku.get(record.sku);
        if (!product) throw new Error(`Missing managed product ${record.sku}.`);
        return ["ka", "en", "de", "ru"].map((locale) => ({
          product_id: product.id,
          locale,
          slug: record.sku.toLowerCase(),
          ...localizedCopy(locale, record.titles[locale], record.creator),
        }));
      }),
      { onConflict: "product_id,locale" },
    ),
    "Translate managed demo products",
  );

  const productIds = products.map((product) => product.id);
  await requireData(
    service.from("product_prices").delete().in("product_id", productIds),
    "Replace managed demo prices",
  );
  const currencyAmounts = { GEL: 120000, USD: 45000, EUR: 42000 };
  await requireData(
    service.from("product_prices").insert(
      products.flatMap((product, index) =>
        Object.entries(currencyAmounts).map(([currency, baseAmount]) => ({
          product_id: product.id,
          currency,
          amount_minor: baseAmount + index * 2500,
          enabled: true,
          source: "explicit",
          source_reference: "licensed-demo-preview",
        })),
      ),
    ),
    "Create managed demo prices",
  );
  await requireData(
    service.from("inventory_items").upsert(
      products.map((product) => ({
        product_id: product.id,
        stock_model: "unique",
        on_hand_quantity: 0,
        reserved_quantity: 0,
        low_stock_threshold: 0,
      })),
      { onConflict: "product_id" },
    ),
    "Create managed demo inventory",
  );
  await requireData(
    service.from("collection_products").upsert(
      products.map((product, index) => ({
        collection_id: collectionId,
        product_id: product.id,
        position: index + 1,
        featured: true,
      })),
      { onConflict: "collection_id,product_id" },
    ),
    "Feature managed demo products",
  );
}

await ensureManagedDemoCatalog();
const loaded = [];

for (const record of records) {
  const product = await requireData(
    service.from("products").select("id,sku").eq("sku", record.sku).single(),
    `Find ${record.sku}`,
  );
  const sourcePath = path.resolve(
    root,
    "design-directions/assets",
    record.file,
  );
  const input = await readFile(sourcePath);
  const inputChecksum = checksum(input);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || metadata.format !== "webp") {
    throw new Error(`${record.file} is not a readable WebP image.`);
  }
  const swapsAxes = [5, 6, 7, 8].includes(metadata.orientation ?? 1);
  const sourceWidth = swapsAxes ? metadata.height : metadata.width;
  const sourceHeight = swapsAxes ? metadata.width : metadata.height;
  let asset = await requireData(
    service
      .from("media_assets")
      .select("id")
      .eq("purpose", "product")
      .eq("checksum_sha256", inputChecksum)
      .maybeSingle(),
    `Find media for ${record.sku}`,
  );
  let batchId;
  let fileId;

  if (!asset) {
    batchId = randomUUID();
    fileId = randomUUID();
    const originalPath = `${batchId}/${fileId}/original`;
    await requireData(
      service.from("ingestion_batches").insert({
        id: batchId,
        title: `Licensed Pexels demo — ${record.sku}`,
        product_id: product.id,
        status: "uploading",
        expected_file_count: 1,
      }),
      `Create batch for ${record.sku}`,
    );
    await requireData(
      service.from("ingestion_files").insert({
        id: fileId,
        batch_id: batchId,
        client_file_id: `licensed-demo-${record.sku.toLowerCase()}`,
        original_filename: record.file,
        storage_path: originalPath,
        expected_mime: "image/webp",
        expected_byte_size: input.byteLength,
        expected_checksum_sha256: inputChecksum,
        status: "uploaded",
      }),
      `Register ${record.file}`,
    );
    const originalUpload = await service.storage
      .from("product-originals")
      .upload(originalPath, input, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });
    if (originalUpload.error) throw originalUpload.error;
    const completed = await requireData(
      service.rpc("complete_ingestion_upload", {
        p_file_id: fileId,
        p_actual_mime: "image/webp",
        p_actual_byte_size: input.byteLength,
        p_actual_checksum_sha256: inputChecksum,
        p_pixel_width: metadata.width,
        p_pixel_height: metadata.height,
        p_orientation: metadata.orientation ?? 1,
      }),
      `Inspect ${record.file}`,
    );
    if (!completed.media_asset_id) {
      throw new Error(
        `The media pipeline did not create an asset for ${record.sku}.`,
      );
    }
    asset = { id: completed.media_asset_id };
  }

  for (const rendition of renditions) {
    const output =
      rendition.format === "jpeg"
        ? await sharp(input)
            .rotate()
            .resize(rendition.width, rendition.height, { fit: "cover" })
            .jpeg({ quality: 86, mozjpeg: true })
            .toBuffer()
        : await sharp(input)
            .rotate()
            .resize(rendition.width, rendition.height, { fit: "cover" })
            .webp({ quality: 84, effort: 5 })
            .toBuffer();
    const renditionPath = `${asset.id}/v1/${rendition.role}-${rendition.width}.${rendition.format}`;
    const upload = await service.storage
      .from("product-renditions")
      .upload(renditionPath, output, {
        contentType: rendition.format === "jpeg" ? "image/jpeg" : "image/webp",
        cacheControl: "31536000, immutable",
        upsert: true,
      });
    if (upload.error) throw upload.error;
    const crop = cropOrigin(
      sourceWidth,
      sourceHeight,
      rendition.width,
      rendition.height,
    );
    await requireData(
      service.from("media_variants").upsert(
        {
          asset_id: asset.id,
          recipe_version: 1,
          role: rendition.role,
          format: rendition.format,
          width: rendition.width,
          height: rendition.height,
          crop_x: crop.x,
          crop_y: crop.y,
          focal_x: 0.5,
          focal_y: 0.5,
          path: renditionPath,
          checksum_sha256: checksum(output),
          byte_size: output.byteLength,
          status: "approved",
        },
        { onConflict: "asset_id,recipe_version,role,format,width" },
      ),
      `Save ${rendition.role} for ${record.sku}`,
    );
  }

  await requireData(
    service
      .from("media_assets")
      .update({ approval_status: "approved" })
      .eq("id", asset.id),
    `Approve media for ${record.sku}`,
  );
  await requireData(
    service
      .from("media_licenses")
      .update({
        ownership_basis: "licensed",
        creator_source: `${record.creator} via Pexels`,
        usage_url: record.source,
        territory:
          "Worldwide website and e-commerce use under the Pexels License",
        approved_at: new Date().toISOString(),
        status: "approved",
      })
      .eq("asset_id", asset.id),
    `Approve license for ${record.sku}`,
  );
  await requireData(
    service
      .from("media_links")
      .delete()
      .eq("entity_type", "product")
      .eq("entity_id", product.id)
      .in("purpose", ["primary", "gallery"]),
    `Replace demo links for ${record.sku}`,
  );
  await requireData(
    service.from("media_links").insert([
      {
        asset_id: asset.id,
        entity_type: "product",
        entity_id: product.id,
        purpose: "primary",
        position: 0,
        primary_link: true,
        approved_crop_version: 1,
      },
      {
        asset_id: asset.id,
        entity_type: "product",
        entity_id: product.id,
        purpose: "gallery",
        position: 0,
        primary_link: false,
        approved_crop_version: 1,
      },
    ]),
    `Link media for ${record.sku}`,
  );
  await requireData(
    service
      .from("products")
      .update({
        primary_media_asset_id: asset.id,
        width_mm: null,
        length_mm: null,
        entered_width: null,
        entered_length: null,
        entered_unit: null,
        shape: null,
        materials: [],
        construction: null,
        colors: [],
        styles: [],
        condition: "licensed-demo-only",
        care_code: null,
        delivery_class: "demo-only",
        origin: null,
        origin_verified: false,
        provenance_summary: `Licensed demonstration photograph by ${record.creator} via Pexels; this is not physical-carpet provenance.`,
        provenance_verified: true,
        published_at: new Date().toISOString(),
        structured_data_eligible: false,
      })
      .eq("id", product.id),
    `Update ${record.sku}`,
  );
  await requireData(
    service
      .from("inventory_items")
      .update({ on_hand_quantity: 0, reserved_quantity: 0 })
      .eq("product_id", product.id),
    `Disable inventory for ${record.sku}`,
  );
  for (const locale of ["ka", "en", "de", "ru"]) {
    await requireData(
      service
        .from("product_translations")
        .update(localizedCopy(locale, record.titles[locale], record.creator))
        .eq("product_id", product.id)
        .eq("locale", locale),
      `Translate ${record.sku} (${locale})`,
    );
  }

  if (fileId) {
    const job = await requireData(
      service
        .from("media_jobs")
        .select("id")
        .eq("subject_id", fileId)
        .maybeSingle(),
      `Find job for ${record.sku}`,
    );
    if (job) {
      await requireData(
        service
          .from("media_jobs")
          .update({
            status: "needs_review",
            progress_stage: "review",
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id),
        `Complete job for ${record.sku}`,
      );
    }
    await requireData(
      service
        .from("ingestion_files")
        .update({
          status: "ready",
          processing_completed_at: new Date().toISOString(),
        })
        .eq("id", fileId),
      `Complete file for ${record.sku}`,
    );
  }
  if (batchId) {
    await requireData(
      service
        .from("ingestion_batches")
        .update({ status: "published", completed_at: new Date().toISOString() })
        .eq("id", batchId),
      `Complete batch for ${record.sku}`,
    );
  }
  loaded.push({ sku: record.sku, assetId: asset.id, source: record.source });
}

process.stdout.write(
  `Loaded ${loaded.length} licensed demonstration carpets into ${environment.label}.\n` +
    loaded.map((item) => `- ${item.sku}: ${item.assetId}\n`).join(""),
);
