import { z } from "zod";

export const orderIdSchema = z.uuid();

export const orderQueueSchema = z.object({
  status: z
    .enum([
      "all",
      "bank_transfer_pending",
      "payment_pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "expired",
      "refunded",
      "partially_refunded",
    ])
    .default("all"),
  paymentStatus: z
    .enum([
      "all",
      "pending",
      "bank_transfer_review",
      "authorized",
      "paid",
      "failed",
      "expired",
      "cancelled",
      "refunded",
      "partially_refunded",
      "uncertain",
      "reconciliation_required",
    ])
    .default("all"),
  query: z.string().trim().max(80).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const transitionOrderSchema = z.object({
  orderId: orderIdSchema,
  expectedVersion: z.coerce.number().int().positive(),
  targetStatus: z.enum(["processing", "cancelled", "expired"]),
  reason: z.string().trim().min(2).max(500),
  idempotencyKey: z.string().min(16).max(180),
});

export const transferReviewSchema = z.object({
  orderId: orderIdSchema,
  decision: z.enum(["matched", "rejected"]),
  transferReference: z.string().trim().min(2).max(160),
  amountMinor: z.coerce.number().int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  evidencePath: z.string().trim().max(500).default(""),
  reconciliationId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.uuid().optional(),
  ),
});

export const shipmentSchema = z.object({
  orderId: orderIdSchema,
  expectedVersion: z.coerce.number().int().positive(),
  carrier: z.string().trim().min(2).max(120),
  serviceLevel: z.string().trim().max(120).default(""),
  trackingReference: z.string().trim().min(2).max(180),
  trackingUrl: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().max(500).optional(),
  ),
  idempotencyKey: z.string().min(16).max(180),
});

export const deliverySchema = z.object({
  fulfillmentId: orderIdSchema,
  eventKey: z.string().min(8).max(180),
  safeLocation: z.string().trim().max(160).default(""),
});

export const refundSchema = z.object({
  orderId: orderIdSchema,
  amountMinor: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(500),
  idempotencyKey: z.string().min(16).max(180),
  providerReference: z.string().trim().max(180).default(""),
});

export const orderNoteSchema = z.object({
  orderId: orderIdSchema,
  note: z.string().trim().min(2).max(2000),
});

export const retryNotificationSchema = z.object({
  notificationId: orderIdSchema,
});
