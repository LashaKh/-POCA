import { z } from "zod";

import { locales } from "@/i18n/routing";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalInteger = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(100_000).optional(),
);
const optionalYear = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1000).max(2200).optional(),
);

export const catalogTranslationInputSchema = z.object({
  locale: z.enum(locales),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(160),
  name: z.string().trim().min(1).max(180),
  shortDescription: z.string().trim().max(500).default(""),
  longDescription: z.string().trim().max(10_000).default(""),
  careText: z.string().trim().max(3_000).default(""),
  searchText: z.string().trim().max(12_000).default(""),
  seoTitle: z.string().trim().max(70).default(""),
  seoDescription: z.string().trim().max(180).default(""),
  altTextReady: z.boolean().default(false),
  status: z.enum(["draft", "reviewed", "published"]).default("draft"),
});

export const catalogProductCommandSchema = z
  .object({
    productId: z.uuid().optional(),
    expectedVersion: z.number().int().positive().optional(),
    sku: z.string().trim().min(2).max(80),
    facts: z.object({
      widthMm: optionalInteger,
      lengthMm: optionalInteger,
      diameterMm: optionalInteger,
      shape: z.string().trim().max(60).default(""),
      materials: z.array(z.string().min(1).max(120)).max(30),
      construction: z.string().trim().max(120).default(""),
      colors: z.array(z.string().min(1).max(120)).max(30),
      styles: z.array(z.string().min(1).max(120)).max(30),
      condition: z.string().trim().max(120).default(""),
      careCode: z.string().trim().max(80).default(""),
      deliveryClass: z.string().trim().max(80).default(""),
      category: z.string().trim().max(80).default(""),
      origin: z.string().trim().max(120).default(""),
      originVerified: z.boolean().default(false),
      ageMinYear: optionalYear,
      ageMaxYear: optionalYear,
      ageVerified: z.boolean().default(false),
      pile: z.string().trim().max(120).default(""),
      pileVerified: z.boolean().default(false),
      handmade: z.boolean().nullable().default(null),
      handmadeVerified: z.boolean().default(false),
      provenanceSummary: z.string().trim().max(2_000).default(""),
      provenanceVerified: z.boolean().default(false),
    }),
    translations: z
      .array(catalogTranslationInputSchema)
      .min(1)
      .max(locales.length)
      .refine(
        (items) =>
          new Set(items.map((item) => item.locale)).size === items.length,
        "DUPLICATE_LOCALE",
      ),
    prices: z
      .array(
        z.object({
          currency: z.enum(["GEL", "USD", "EUR"]),
          amountMinor: z.number().int().safe().nonnegative(),
          enabled: z.boolean(),
        }),
      )
      .min(1)
      .max(3),
    stockModel: z.enum(["unique", "stocked"]),
    onHandQuantity: z.number().int().min(0).max(1_000_000),
    changeNote: z.string().trim().min(2).max(500),
  })
  .superRefine((value, context) => {
    const facts = value.facts;
    const verifiedPairs = [
      [facts.origin, facts.originVerified, "originVerified"],
      [facts.ageMinYear ?? facts.ageMaxYear, facts.ageVerified, "ageVerified"],
      [facts.pile, facts.pileVerified, "pileVerified"],
      [facts.handmade, facts.handmadeVerified, "handmadeVerified"],
      [facts.provenanceSummary, facts.provenanceVerified, "provenanceVerified"],
    ] as const;
    for (const [fact, verified, field] of verifiedPairs) {
      if (fact !== "" && fact !== undefined && fact !== null && !verified) {
        context.addIssue({
          code: "custom",
          path: ["facts", field],
          message: "VERIFICATION_REQUIRED",
        });
      }
    }
    if (
      facts.ageMinYear !== undefined &&
      facts.ageMaxYear !== undefined &&
      facts.ageMinYear > facts.ageMaxYear
    ) {
      context.addIssue({
        code: "custom",
        path: ["facts", "ageMaxYear"],
        message: "INVALID_AGE_RANGE",
      });
    }
  });

export const catalogListSchema = z.object({
  query: z.string().trim().max(80).default(""),
  status: z
    .enum([
      "all",
      "draft",
      "in_review",
      "scheduled",
      "published",
      "unpublished",
      "archived",
    ])
    .default("all"),
  translation: z.enum(["all", "complete", "missing"]).default("all"),
  stock: z.enum(["all", "available", "unavailable", "low"]).default("all"),
  sort: z
    .enum(["updated-desc", "updated-asc", "sku-asc", "stock-asc"])
    .default("updated-desc"),
  page: z.coerce.number().int().min(1).default(1),
});

export const catalogListResultSchema = z.object({
  count: z.number().int().nonnegative(),
  rows: z.array(
    z.object({
      id: z.uuid(),
      sku: z.string(),
      status: z.enum([
        "draft",
        "in_review",
        "scheduled",
        "published",
        "unpublished",
        "archived",
      ]),
      version: z.number().int().positive(),
      updated_at: z.string(),
      display_name: z.string(),
      gel_amount_minor: z.number().int().nonnegative().nullable(),
      on_hand_quantity: z.number().int().nonnegative().nullable(),
      reserved_quantity: z.number().int().nonnegative().nullable(),
      available_quantity: z.number().int().nonnegative().nullable(),
      missing_locales: z.array(z.enum(locales)),
    }),
  ),
});

export const inventoryAdjustmentSchema = z.object({
  locale: z.enum(locales),
  productId: z.uuid(),
  expectedInventoryVersion: z.coerce.number().int().positive(),
  quantityDelta: z.coerce
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine(Boolean),
  reason: z.string().trim().min(2).max(500),
  idempotencyKey: z.string().min(16).max(180),
});

export const bulkCatalogActionSchema = z
  .object({
    locale: z.enum(locales),
    productIds: z.array(z.uuid()).min(1).max(500),
    action: z.enum([
      "publish",
      "unpublish",
      "archive",
      "restore",
      "collection_add",
      "collection_remove",
    ]),
    collectionId: z.uuid().optional(),
    reason: z.string().trim().min(2).max(500),
    idempotencyKey: z.string().min(16).max(180),
  })
  .refine(
    (value) =>
      !value.action.startsWith("collection_") || Boolean(value.collectionId),
    { path: ["collectionId"], message: "COLLECTION_REQUIRED" },
  );

export const collectionCommandSchema = z.object({
  locale: z.enum(locales),
  collectionId: z.uuid().optional(),
  expectedVersion: z.number().int().positive().optional(),
  code: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  orderStrategy: z.enum(["manual", "newest", "price_asc", "price_desc"]),
  scheduledAt: z.preprocess(
    emptyToUndefined,
    z.iso.datetime({ local: true }).optional(),
  ),
  translations: z.array(
    z.object({
      locale: z.enum(locales),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .max(160),
      name: z.string().trim().min(1).max(180),
      description: z.string().trim().max(6_000).default(""),
      seoTitle: z.string().trim().max(70).default(""),
      seoDescription: z.string().trim().max(180).default(""),
      status: z.enum(["draft", "reviewed", "published"]).default("draft"),
    }),
  ),
  note: z.string().trim().min(2).max(500),
});

export const scheduleCatalogProductSchema = z.object({
  locale: z.enum(locales),
  productId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  scheduledAt: z.iso.datetime({ local: true }),
  reason: z.string().trim().min(2).max(500),
});

export const savedCatalogViewSchema = catalogListSchema.extend({
  locale: z.enum(locales),
  name: z.string().trim().min(1).max(100),
});

export const reorderCollectionSchema = z.object({
  locale: z.enum(locales),
  collectionId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  productIds: z.array(z.uuid()).max(500),
  featuredProductId: z.uuid().optional(),
});

export function splitCatalogTerms(value: string) {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function decimalToMinor(value: string) {
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(value)) {
    throw new RangeError("INVALID_MONEY");
  }
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor)) throw new RangeError("INVALID_MONEY");
  return minor;
}

export function translationCompleteness(
  translations: Array<{ locale: (typeof locales)[number]; name?: string }>,
) {
  const present = new Set(
    translations.filter((item) => item.name?.trim()).map((item) => item.locale),
  );
  return {
    complete: locales.every((locale) => present.has(locale)),
    missing: locales.filter((locale) => !present.has(locale)),
  };
}

export function copiedTranslationWarnings(
  translations: Array<{ locale: (typeof locales)[number]; name: string }>,
) {
  const groups = new Map<string, string[]>();
  for (const item of translations) {
    const normalized = item.name.trim().toLocaleLowerCase(item.locale);
    if (!normalized) continue;
    groups.set(normalized, [...(groups.get(normalized) ?? []), item.locale]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
