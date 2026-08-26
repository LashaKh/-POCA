import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { renderOrderNotification } from "@/emails/order/notifications";
import { renderContactNotification } from "@/emails/contact";
import { renderContentNotification } from "@/emails/content";
import { renderReturnNotification } from "@/emails/returns";
import { renderQuoteNotification } from "@/emails/quotes";
import type { AppLocale } from "@/i18n/routing";
import { getServerEnvironment } from "@/lib/env/server";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";
import { logger } from "@/lib/observability/logger";
import { recordMetric } from "@/lib/observability/metrics";
import { createEmailProvider } from "@/lib/providers/registry";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const payloadSchema = z.object({
  recipientEmail: z.email(),
  orderReference: z.string().min(1).max(40).optional(),
  amountMinor: z.number().int().nonnegative().optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  paymentStatus: z.string().max(80).optional(),
  carrier: z.string().max(120).nullable().optional(),
  trackingReference: z.string().max(180).nullable().optional(),
  trackingUrl: z.url().nullable().optional(),
  refundAmountMinor: z.number().int().nonnegative().optional(),
  returnReference: z.string().max(40).optional(),
  quoteReference: z.string().max(40).optional(),
  contactReference: z.string().max(40).optional(),
  subscriptionReference: z.string().max(40).optional(),
});

function safeErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9_]{2,80}$/.test(error.code)
  ) {
    return error.code;
  }
  return "EMAIL_SEND_FAILED";
}

export async function processNotificationOutbox(
  input: {
    workerId?: string;
    limit?: number;
  } = {},
) {
  const startedAt = performance.now();
  const workerId = input.workerId ?? `email-${randomUUID()}`;
  const client = createServiceSupabaseClient();
  const provider = createEmailProvider();
  const environment = getServerEnvironment();
  const { data: notifications, error } = await client.rpc(
    "claim_notification_outbox",
    {
      p_worker_id: workerId,
      p_claim_limit: input.limit ?? 20,
      p_lease_seconds: 120,
    },
  );
  if (error) throw error;
  let completed = 0;
  let failed = 0;
  for (const notification of notifications) {
    try {
      const payload = payloadSchema.parse(notification.payload);
      const currency = payload.currency ?? "GEL";
      const money = (amount: number | undefined) =>
        amount === undefined
          ? undefined
          : formatMinorMoney(
              minorAmount(amount),
              currency as "GEL" | "USD" | "EUR",
              notification.locale,
            );
      const rendered =
        notification.template_key.startsWith("contact-") &&
        payload.contactReference
          ? renderContactNotification(notification.locale as AppLocale, {
              templateKey: notification.template_key,
              contactReference: payload.contactReference,
            })
          : notification.template_key.startsWith("newsletter-") &&
              payload.subscriptionReference
            ? renderContentNotification(notification.locale as AppLocale, {
                templateKey: notification.template_key,
                reference: payload.subscriptionReference,
              })
            : notification.template_key.startsWith("quote-") &&
                payload.quoteReference
              ? renderQuoteNotification(notification.locale as AppLocale, {
                  templateKey: notification.template_key,
                  quoteReference: payload.quoteReference,
                  amount: money(payload.amountMinor),
                })
              : notification.template_key.startsWith("return-") &&
                  payload.returnReference
                ? renderReturnNotification(notification.locale as AppLocale, {
                    templateKey: notification.template_key,
                    orderReference: payload.orderReference ?? "",
                    returnReference: payload.returnReference,
                    refundAmount: money(payload.refundAmountMinor),
                  })
                : renderOrderNotification(notification.locale as AppLocale, {
                    templateKey: notification.template_key,
                    orderReference: payload.orderReference ?? "",
                    amount: money(payload.amountMinor),
                    refundAmount: money(payload.refundAmountMinor),
                    paymentStatus: payload.paymentStatus,
                    carrier: payload.carrier ?? undefined,
                    trackingReference: payload.trackingReference ?? undefined,
                    trackingUrl: payload.trackingUrl ?? undefined,
                  });
      const sent = await provider.send({
        to: payload.recipientEmail,
        from: environment.EMAIL_FROM || "noreply@epoca.local",
        ...rendered,
        idempotencyKey: notification.idempotency_key,
        tags: [{ name: "purpose", value: notification.purpose }],
      });
      const { error: completionError } = await client.rpc(
        "complete_notification_attempt",
        {
          p_notification_id: notification.id,
          p_worker_id: workerId,
          p_provider: sent.provider,
          p_outcome: sent.outcome,
          p_provider_reference: sent.providerReference,
          p_safe_error_code: undefined,
        },
      );
      if (completionError) throw completionError;
      completed += 1;
    } catch (sendError) {
      const code = safeErrorCode(sendError);
      const { error: completionError } = await client.rpc(
        "complete_notification_attempt",
        {
          p_notification_id: notification.id,
          p_worker_id: workerId,
          p_provider: provider.name,
          p_outcome: "failed",
          p_provider_reference: undefined,
          p_safe_error_code: code,
        },
      );
      logger.error({
        correlationId: notification.correlation_id,
        event: "notification.send",
        actorClass: "service",
        outcome: "failed",
        metadata: {
          notificationId: notification.id,
          errorCode: code,
          completionError: completionError?.code,
        },
      });
      failed += 1;
    }
  }
  const result = { claimed: notifications.length, completed, failed };
  const durationMs = Math.round(performance.now() - startedAt);
  logger.info({
    correlationId: randomUUID(),
    event: "notification.worker",
    actorClass: "service",
    outcome: failed > 0 ? "failed" : "succeeded",
    durationMs,
    metadata: {
      ...result,
      metric: recordMetric({
        name: "worker_duration_ms",
        type: "histogram",
        value: durationMs,
        labels: {
          job: "notification_outbox",
          outcome: failed > 0 ? "failed" : "succeeded",
        },
      }),
    },
  });
  return result;
}
