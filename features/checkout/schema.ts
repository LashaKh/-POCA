import { z } from "zod";

import { locales } from "@/i18n/routing";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || undefined)
    .optional();

export const internationalAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  organization: optionalText(160),
  line1: z.string().trim().min(1).max(200),
  line2: optionalText(200),
  city: z.string().trim().min(1).max(120),
  region: optionalText(120),
  postalCode: optionalText(40),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  instructions: optionalText(500),
});

export const checkoutPreparationSchema = z.object({
  locale: z.enum(locales),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  methodCode: z.string().trim().min(1).max(80),
});

export const checkoutAcceptanceSchema = internationalAddressSchema.extend({
  locale: z.enum(locales),
  checkoutSessionId: z.uuid(),
  expectedTotalMinor: z.coerce.number().int().nonnegative(),
  acceptChanges: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
  termsAccepted: z.literal("on"),
  termsVersion: z.string().min(1).max(80),
  idempotencyKey: z.string().min(16).max(128),
  email: z.email().max(254),
  phone: optionalText(40),
  paymentMethod: z
    .enum(["bank_transfer", "hosted_payment"])
    .default("bank_transfer"),
});

const quoteLineSchema = z.object({
  cartItemId: z.uuid(),
  productId: z.uuid(),
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  quantity: z.int().positive(),
  unitAmountMinor: z.int().nonnegative(),
  previousUnitAmountMinor: z.int().nonnegative().nullable(),
  availableQuantity: z.int().nonnegative(),
  deliveryClass: z.string().nullable(),
});

export const quoteBreakdownSchema = z.object({
  lines: z.array(quoteLineSchema).min(1),
  changed: z.boolean(),
  includedTaxMinor: z.int().nonnegative(),
  taxRateBasisPoints: z.int().min(0).max(10000),
  taxIncluded: z.boolean(),
  discountCode: z.string().nullable(),
  deliveryMethodCode: z.string(),
  deliveryMethodName: z.object({
    ka: z.string(),
    en: z.string(),
    de: z.string(),
    ru: z.string(),
  }),
  estimateMinDays: z.int().nonnegative().nullable(),
  estimateMaxDays: z.int().nonnegative().nullable(),
  customsResponsibility: z.string(),
  customsCopy: z
    .object({
      ka: z.string(),
      en: z.string(),
      de: z.string(),
      ru: z.string(),
    })
    .partial()
    .optional(),
  taxDisplayMode: z.string().optional(),
  marketCode: z.string().nullable().optional(),
  marketLegalStatus: z.string().optional(),
  serviceLevel: z
    .object({
      ka: z.string(),
      en: z.string(),
      de: z.string(),
      ru: z.string(),
    })
    .optional(),
  discountCapped: z.boolean().optional(),
});

export type CheckoutAcceptance = z.infer<typeof checkoutAcceptanceSchema>;
export type QuoteBreakdown = z.infer<typeof quoteBreakdownSchema>;
