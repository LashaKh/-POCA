import { z } from "zod";

import { currencyPreferenceSchema } from "@/i18n/preferences";
import { locales } from "@/i18n/routing";

export const catalogSortSchema = z.enum([
  "relevance",
  "newest",
  "price-asc",
  "price-desc",
]);

export const availabilityFilterSchema = z.enum(["all", "in-stock"]);

export const catalogProductRowSchema = z.object({
  id: z.uuid(),
  sku: z.string().min(2).max(80),
  slug: z.string().min(1).max(160),
  name: z.string().min(1).max(180),
  shortDescription: z.string().max(500).optional(),
  contentLocale: z.enum(locales),
  requestedLocale: z.enum(locales),
  amountMinor: z.number().int().safe().nonnegative(),
  currency: currencyPreferenceSchema,
  availableQuantity: z.number().int().nonnegative(),
  widthMm: z.number().int().positive().optional(),
  lengthMm: z.number().int().positive().optional(),
  materials: z.array(z.string().min(1).max(120)).default([]),
  colors: z.array(z.string().min(1).max(120)).default([]),
  origin: z.string().max(120).optional(),
  originVerified: z.boolean().default(false),
  primaryImagePath: z.string().max(500).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(180).optional(),
  condition: z.string().max(120).optional(),
  structuredDataEligible: z.boolean().default(false),
  brand: z.string().max(120).optional(),
  gtin: z
    .string()
    .regex(/^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/)
    .optional(),
  mpn: z.string().max(70).optional(),
  identifierExists: z.boolean().nullable().default(null),
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
