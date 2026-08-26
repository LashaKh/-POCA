import { z } from "zod";

import { currencyPreferenceSchema } from "@/i18n/preferences";
import { locales } from "@/i18n/routing";

export const promotionSchema = z
  .object({
    locale: z.enum(locales),
    discountId: z.uuid().optional().or(z.literal("")),
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/),
    kind: z.enum(["percentage", "fixed"]),
    percentageBasisPoints: z.coerce.number().int().min(1).max(10000).optional(),
    fixedAmountMinor: z.coerce.number().int().nonnegative().optional(),
    currency: currencyPreferenceSchema.optional().or(z.literal("")),
    minimumSubtotalMinor: z.coerce.number().int().nonnegative(),
    maximumDiscountMinor: z.coerce.number().int().nonnegative().optional(),
    usageLimit: z.coerce.number().int().positive().optional(),
    perSubjectLimit: z.coerce.number().int().min(1).max(100),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    combinability: z.enum(["exclusive", "same_group", "stackable"]),
    stackingGroup: z.string().trim().optional(),
    priority: z.coerce.number().int().min(-1000).max(1000),
    publicNameKa: z.string().trim().min(1).max(160),
    publicNameEn: z.string().trim().min(1).max(160),
    publicNameDe: z.string().trim().min(1).max(160),
    publicNameRu: z.string().trim().min(1).max(160),
    descriptionKa: z.string().trim().max(500).optional(),
    descriptionEn: z.string().trim().max(500).optional(),
    descriptionDe: z.string().trim().max(500).optional(),
    descriptionRu: z.string().trim().max(500).optional(),
    configurationStatus: z.enum(["draft", "published", "disabled"]),
    expectedVersion: z.coerce.number().int().nonnegative(),
    reason: z.string().trim().min(2).max(500),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    path: ["endsAt"],
    message: "INVALID_INTERVAL",
  })
  .refine(
    (value) =>
      value.kind === "percentage"
        ? value.percentageBasisPoints !== undefined
        : value.fixedAmountMinor !== undefined && Boolean(value.currency),
    { path: ["kind"], message: "INVALID_PROMOTION_VALUE" },
  )
  .refine(
    (value) => value.combinability !== "same_group" || value.stackingGroup,
    { path: ["stackingGroup"], message: "STACKING_GROUP_REQUIRED" },
  );
