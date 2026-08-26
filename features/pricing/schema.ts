import { z } from "zod";

import { currencyPreferenceSchema } from "@/i18n/preferences";
import { locales } from "@/i18n/routing";

const optionalTrimmed = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const currencySettingSchema = z.object({
  locale: z.enum(locales),
  currency: currencyPreferenceSchema,
  enabled: z.boolean(),
  checkoutEnabled: z.boolean(),
  isDefault: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(1000),
  priceSourceMode: z.enum(["explicit_only", "approved_rate_snapshot"]),
  approvedRateReference: optionalTrimmed,
  configurationStatus: z.enum(["draft", "published", "disabled"]),
  expectedVersion: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(500),
});

export const marketPriceSchema = z
  .object({
    locale: z.enum(locales),
    productId: z.uuid(),
    currency: currencyPreferenceSchema,
    marketCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{2,20}$/)
      .optional()
      .or(z.literal("")),
    amountMinor: z.coerce.number().int().nonnegative(),
    activeFrom: z.iso.datetime(),
    activeUntil: z.iso.datetime(),
    enabled: z.boolean(),
    source: z.enum(["explicit", "approved_rate_snapshot"]),
    sourceReference: optionalTrimmed,
    expectedVersion: z.coerce.number().int().nonnegative(),
    reason: z.string().trim().min(2).max(500),
  })
  .refine((value) => value.activeUntil > value.activeFrom, {
    path: ["activeUntil"],
    message: "INVALID_INTERVAL",
  });

export function checkbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}
