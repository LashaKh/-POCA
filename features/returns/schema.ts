import { z } from "zod";

import { isAppLocale } from "@/i18n/routing";

export const returnReasonValues = [
  "changed_mind",
  "damaged",
  "not_as_described",
  "wrong_item",
  "other",
] as const;

export const returnRequestSchema = z
  .object({
    locale: z.string().refine(isAppLocale),
    orderReference: z.string().regex(/^EPO-[A-Z0-9]{12}$/),
    requestKind: z.enum(["cancellation", "return"]),
    reasonCode: z.enum(returnReasonValues),
    buyerNote: z.string().trim().min(2).max(2000),
    lineId: z.string().uuid().optional().or(z.literal("")),
    quantity: z.coerce.number().int().min(1).max(20).default(1),
    idempotencyToken: z.string().uuid(),
  })
  .superRefine((value, context) => {
    if (value.requestKind === "return" && !value.lineId) {
      context.addIssue({
        code: "custom",
        path: ["lineId"],
        message: "A returned order line is required.",
      });
    }
  });

const staffBase = z.object({
  locale: z.string().refine(isAppLocale),
  returnRequestId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  idempotencyToken: z.string().uuid(),
});

export const returnInformationSchema = staffBase.extend({
  message: z.string().trim().min(2).max(2000),
});

export const returnDecisionSchema = staffBase.extend({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().min(2).max(2000),
});

export const returnReceiptSchema = staffBase.extend({
  note: z.string().trim().min(2).max(2000),
});

export const returnInspectionItemSchema = z.object({
  itemId: z.string().uuid(),
  condition: z.enum(["unopened", "like_new", "used", "damaged", "missing"]),
  restockDecision: z.enum(["restock", "do_not_restock"]),
  refundAmountMinor: z.coerce.number().int().nonnegative(),
  itemNote: z.string().trim().max(1000).optional().default(""),
});

export const returnInspectionSchema = staffBase.extend({
  summary: z.string().trim().min(2).max(2000),
  packageCondition: z.string().trim().max(500).optional().default(""),
  items: z.array(returnInspectionItemSchema).min(1).max(100),
});

export const returnRefundSchema = staffBase.extend({
  reason: z.string().trim().min(2).max(500),
  providerReference: z.string().trim().min(2).max(180),
});

export const returnRestockSchema = z.object({
  locale: z.string().refine(isAppLocale),
  returnRequestId: z.string().uuid(),
  idempotencyToken: z.string().uuid(),
});

export const returnPolicySchema = z.object({
  locale: z.string().refine(isAppLocale),
  version: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]{3,80}$/),
  cancellationWindowHours: z.coerce.number().int().min(0).max(720),
  returnWindowDays: z.coerce.number().int().min(0).max(365),
  allowedReasons: z
    .array(z.enum(returnReasonValues))
    .min(1)
    .max(returnReasonValues.length),
  maxEvidenceFiles: z.coerce.number().int().min(0).max(10),
  maxEvidenceBytes: z.coerce
    .number()
    .int()
    .min(1024)
    .max(10 * 1024 * 1024),
  restockMode: z.enum(["after_inspection", "never"]),
});

export const returnQueueSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  status: z
    .enum([
      "all",
      "requested",
      "needs_information",
      "approved",
      "in_transit",
      "received",
      "inspected",
      "refund_pending",
      "refunded",
      "rejected",
      "closed",
      "cancelled",
    ])
    .default("all"),
  kind: z.enum(["all", "cancellation", "return"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
});
