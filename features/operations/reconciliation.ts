import "server-only";

import { z } from "zod";

import { processNotificationOutbox } from "@/features/operations/notification-worker";
import { processPaymentProviderEvents } from "@/features/payments/webhook-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const orderOperationsSummarySchema = z.object({
  pendingPayments: z.number().int().nonnegative(),
  transferReviews: z.number().int().nonnegative(),
  fulfillment: z.number().int().nonnegative(),
  failedNotifications: z.number().int().nonnegative(),
  providerFailures: z.number().int().nonnegative(),
  alerts: z.number().int().nonnegative(),
  lowStock: z.number().int().nonnegative(),
  missingTranslations: z.number().int().nonnegative(),
  failedIngestion: z.number().int().nonnegative(),
  openReturns: z.number().int().nonnegative(),
  oldestOpenMinutes: z.number().int().nonnegative(),
});

export async function getOrderOperationsSummary() {
  const client = await createServerSupabaseClient();
  const result = await client.rpc("read_order_operations_summary");
  if (result.error) throw result.error;
  return orderOperationsSummarySchema.parse(result.data);
}

export async function runOrderRecovery() {
  const client = createServiceSupabaseClient();
  const [payments, notifications, expiry] = await Promise.all([
    processPaymentProviderEvents({ limit: 20 }),
    processNotificationOutbox({ limit: 25 }),
    client.rpc("expire_due_checkout_work", { p_limit: 100 }),
  ]);
  if (expiry.error) throw expiry.error;
  return { payments, notifications, expired: expiry.data };
}
