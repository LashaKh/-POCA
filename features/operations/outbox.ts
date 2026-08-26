import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { renderOrderEmail } from "@/emails/order";
import { captureEmail } from "@/lib/providers/email/capture";
import { getServerEnvironment } from "@/lib/env/server";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const orderNotificationPayloadSchema = z.object({
  recipientEmail: z.email(),
  orderReference: z.string(),
  amountMinor: z.int().nonnegative(),
  currency: z.enum(["GEL", "USD", "EUR"]),
  dueAt: z.iso.datetime({ offset: true }),
  paymentMode: z.literal("bank_transfer"),
});

export async function captureOrderNotification(
  orderId: string,
  bank: {
    beneficiary: string;
    bank: string;
    iban: string;
    instructions: string;
  },
) {
  const environment = getServerEnvironment();
  if (environment.EMAIL_PROVIDER_MODE !== "fixture")
    return { captured: false as const };
  const client = createServiceSupabaseClient();
  const { data: link, error: linkError } = await client
    .from("order_notification_links")
    .select("notification_id")
    .eq("order_id", orderId)
    .eq("purpose", "order-accepted")
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link) throw new Error("ORDER_NOTIFICATION_NOT_FOUND");
  const { data: notification, error } = await client
    .from("notifications")
    .select("*")
    .eq("id", link.notification_id)
    .single();
  if (error) throw error;
  if (notification.status === "sent" || notification.status === "delivered") {
    return { captured: true as const, notificationId: notification.id };
  }
  const payload = orderNotificationPayloadSchema.parse(notification.payload);
  const dueAt = new Intl.DateTimeFormat(notification.locale, {
    dateStyle: "long",
  }).format(new Date(payload.dueAt));
  const rendered = renderOrderEmail(notification.locale, {
    orderReference: payload.orderReference,
    amount: formatMinorMoney(
      minorAmount(payload.amountMinor),
      payload.currency,
      notification.locale,
    ),
    dueAt,
    ...bank,
  });
  const captured = captureEmail({
    ...rendered,
    to: payload.recipientEmail,
    idempotencyKey: notification.idempotency_key,
  });
  const attemptNumber = notification.attempt_count + 1;
  const { error: attemptError } = await client
    .from("notification_attempts")
    .upsert(
      {
        notification_id: notification.id,
        attempt_number: attemptNumber,
        provider: "local-capture",
        provider_reference: captured.id,
        outcome: "sent",
        started_at: captured.capturedAt,
        completed_at: captured.capturedAt,
      },
      { onConflict: "notification_id,attempt_number", ignoreDuplicates: true },
    );
  if (attemptError) throw attemptError;
  const { error: updateError } = await client
    .from("notifications")
    .update({
      status: "sent",
      attempt_count: attemptNumber,
      lease_owner: null,
      lease_expires_at: null,
    })
    .eq("id", notification.id)
    .in("status", ["pending", "failed"]);
  if (updateError) throw updateError;
  return {
    captured: true as const,
    notificationId: notification.id,
    correlationId: randomUUID(),
  };
}
