import { z } from "zod";

import { locales } from "@/i18n/routing";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || undefined)
    .optional();

export const customerAddressSchema = z.object({
  locale: z.enum(locales),
  addressId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.uuid().optional(),
  ),
  expectedVersion: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  label: z.string().trim().min(1).max(80),
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
  phone: optionalText(40),
  instructions: optionalText(500),
  isDefault: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean(),
  ),
});

export const deleteCustomerAddressSchema = z.object({
  locale: z.enum(locales),
  addressId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

export const customerPreferencesSchema = z.object({
  locale: z.enum(locales),
  displayName: z.string().trim().min(1).max(160),
  displayCurrency: z.enum(["GEL", "USD", "EUR"]),
  marketingChoice: z.enum(["granted", "refused", "withdrawn"]),
});

export const customerPrivacySchema = z.object({
  locale: z.enum(locales),
  requestType: z.enum(["access", "export", "correction", "deletion"]),
  reason: z.string().trim().min(2).max(500),
});

export const orderReferenceSchema = z.string().regex(/^EPO-[A-Z0-9]{12}$/);
