import { z } from "zod";

import { internationalAddressSchema } from "@/features/checkout/schema";
import { currencyPreferenceSchema } from "@/i18n/preferences";
import { locales } from "@/i18n/routing";

export const manualQuoteSubmissionSchema = internationalAddressSchema.extend({
  locale: z.enum(locales),
  email: z.email().max(254),
  phone: z.string().trim().max(40).optional(),
  buyerNote: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().min(16).max(128),
});

export const manualQuoteResolutionSchema = z
  .object({
    locale: z.enum(locales),
    quoteId: z.uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    amountMinor: z.coerce.number().int().nonnegative(),
    currency: currencyPreferenceSchema,
    methodKa: z.string().trim().min(1).max(160),
    methodEn: z.string().trim().min(1).max(160),
    methodDe: z.string().trim().min(1).max(160),
    methodRu: z.string().trim().min(1).max(160),
    estimateMinDays: z.coerce.number().int().min(0).max(365),
    estimateMaxDays: z.coerce.number().int().min(0).max(365),
    customsResponsibility: z.enum([
      "buyer_unless_confirmed",
      "seller",
      "included_by_carrier",
      "pending_legal_review",
    ]),
    legalStatus: z.enum(["draft_unapproved", "approved"]),
    expiresAt: z.iso.datetime(),
    staffNote: z.string().trim().max(2000).optional(),
    buyerMessage: z.string().trim().min(2).max(2000),
    idempotencyKey: z.string().min(16).max(128),
  })
  .refine((value) => value.estimateMaxDays >= value.estimateMinDays, {
    path: ["estimateMaxDays"],
    message: "INVALID_ESTIMATE",
  });

export const manualQuoteInformationSchema = z.object({
  locale: z.enum(locales),
  quoteId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  buyerMessage: z.string().trim().min(2).max(2000),
  idempotencyKey: z.string().min(16).max(128),
});

export const manualQuoteResponseSchema = z.object({
  locale: z.enum(locales),
  quoteId: z.uuid(),
  reference: z.string().regex(/^QUO-[A-Z0-9]{12}$/),
  expectedVersion: z.coerce.number().int().positive(),
  response: z.enum(["accept", "decline"]),
  idempotencyKey: z.string().min(16).max(128),
});
