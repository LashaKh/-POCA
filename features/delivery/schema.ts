import { z } from "zod";

import { currencyPreferenceSchema } from "@/i18n/preferences";
import { locales } from "@/i18n/routing";

const fourLocaleShape = {
  ka: z.string().trim().min(1).max(500),
  en: z.string().trim().min(1).max(500),
  de: z.string().trim().min(1).max(500),
  ru: z.string().trim().min(1).max(500),
};

const base = z.object({
  locale: z.enum(locales),
  expectedVersion: z.coerce.number().int().nonnegative(),
  reason: z.string().trim().min(2).max(500),
});

export const shippingZoneSchema = base.extend({
  zoneId: z.uuid().optional().or(z.literal("")),
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(120),
  priority: z.coerce.number().int().min(-1000).max(1000),
  countryCodes: z
    .string()
    .transform((value) => [
      ...new Set(
        value
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((code) => code.toUpperCase()),
      ),
    ])
    .pipe(
      z
        .array(z.string().regex(/^[A-Z]{2}$/))
        .min(1)
        .max(249),
    ),
  configurationStatus: z.enum(["draft", "published", "disabled"]),
  legalStatus: z.enum(["draft_unapproved", "approved"]),
});

export const shippingMethodSchema = base
  .extend({
    methodId: z.uuid().optional().or(z.literal("")),
    code: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.object(fourLocaleShape),
    serviceLevel: z.object(fourLocaleShape),
    customs: z.object(fourLocaleShape),
    estimateMinDays: z.coerce.number().int().min(0).max(365),
    estimateMaxDays: z.coerce.number().int().min(0).max(365),
    manualQuote: z.boolean(),
    configurationStatus: z.enum(["draft", "published", "disabled"]),
  })
  .refine((value) => value.estimateMaxDays >= value.estimateMinDays, {
    path: ["estimateMaxDays"],
    message: "INVALID_ESTIMATE",
  });

export const shippingRateSchema = base
  .extend({
    rateId: z.uuid().optional().or(z.literal("")),
    zoneId: z.uuid(),
    methodId: z.uuid(),
    currency: currencyPreferenceSchema,
    amountMinor: z.coerce.number().int().nonnegative(),
    freeThresholdMinor: z.coerce.number().int().nonnegative().optional(),
    minimumSubtotalMinor: z.coerce.number().int().nonnegative(),
    maximumSubtotalMinor: z.coerce.number().int().nonnegative().optional(),
    deliveryClasses: z
      .string()
      .transform((value) => [
        ...new Set(value.split(/[\s,]+/).filter(Boolean)),
      ]),
    priority: z.coerce.number().int().min(-1000).max(1000),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    enabled: z.boolean(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "INVALID_INTERVAL",
  })
  .refine(
    (value) =>
      value.maximumSubtotalMinor === undefined ||
      value.maximumSubtotalMinor >= value.minimumSubtotalMinor,
    { path: ["maximumSubtotalMinor"], message: "INVALID_RANGE" },
  );

export const marketSettingSchema = base.extend({
  marketCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,20}$/),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  defaultCurrency: currencyPreferenceSchema,
  taxDisplayMode: z.enum([
    "included",
    "added_at_checkout",
    "not_applicable",
    "pending_legal_review",
  ]),
  taxRegistrationReference: z.string().trim().max(200).optional(),
  customsResponsibility: z.enum([
    "buyer_unless_confirmed",
    "seller",
    "included_by_carrier",
    "pending_legal_review",
  ]),
  customs: z.object(fourLocaleShape),
  legalStatus: z.enum(["draft_unapproved", "approved"]),
  enabled: z.boolean(),
});
