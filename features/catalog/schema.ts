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
});
