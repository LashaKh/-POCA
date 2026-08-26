import "server-only";

import { randomUUID } from "node:crypto";

import { logger } from "@/lib/observability/logger";
import { recordMetric } from "@/lib/observability/metrics";
import { createPaymentProvider } from "@/lib/providers/registry";
import type {
  PaymentProviderState,
  VerifiedPaymentCallback,
} from "@/lib/providers/payment/types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const reconcilableStates = new Set<PaymentProviderState>([
  "authorized",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "uncertain",
]);

export async function recordVerifiedPaymentCallback(
  callback: VerifiedPaymentCallback,
) {
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("record_provider_event", {
    p_provider: callback.provider,
    p_event_key: callback.eventKey,
    p_event_type: callback.eventType,
    p_subject_reference: callback.providerReference,
    p_payload_hash: callback.payloadHash,
    p_signature_valid: true,
    p_safe_metadata: callback.safeMetadata,
  });
  if (error) throw error;
  return data;
}

export async function acceptTbcCallback(input: {
  body: unknown;
  sourceIp?: string;
}) {
  const provider = createPaymentProvider();
  if (provider.name !== "tbc") throw new Error("TBC_PROVIDER_DISABLED");
  const verified = await provider.verifyCallback(input);
  return recordVerifiedPaymentCallback(verified);
}

async function failInboxEvent(eventId: string, workerId: string, code: string) {
  const client = createServiceSupabaseClient();
  const { error } = await client.rpc("fail_provider_event", {
    p_provider_event_id: eventId,
    p_worker_id: workerId,
    p_safe_error_code: code,
  });
  if (error) throw error;
}

export async function processPaymentProviderEvents(
  input: {
    workerId?: string;
    limit?: number;
  } = {},
) {
  const startedAt = performance.now();
  const workerId = input.workerId ?? `payment-${randomUUID()}`;
  const client = createServiceSupabaseClient();
  const provider = createPaymentProvider();
  const { data: events, error } = await client.rpc("claim_provider_events", {
    p_worker_id: workerId,
    p_claim_limit: input.limit ?? 20,
    p_lease_seconds: 120,
  });
  if (error) throw error;
  let completed = 0;
  let failed = 0;
  for (const event of events) {
    try {
      if (event.provider !== provider.name || !event.subject_reference) {
        await failInboxEvent(event.id, workerId, "PROVIDER_MISMATCH");
        failed += 1;
        continue;
      }
      const authoritative = await provider.getPayment(event.subject_reference);
      const { data: attempt, error: attemptError } = await client
        .from("payment_attempts")
        .select("id,order_id,amount_minor,currency")
        .eq("provider", event.provider)
        .eq("provider_reference", event.subject_reference)
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!attempt || !reconcilableStates.has(authoritative.state)) {
        await failInboxEvent(
          event.id,
          workerId,
          attempt ? "PAYMENT_STILL_PENDING" : "PAYMENT_REFERENCE_UNKNOWN",
        );
        failed += 1;
        continue;
      }
      const { error: reconcileError } = await client.rpc("reconcile_payment", {
        p_order_id: attempt.order_id,
        p_provider_event_key: event.event_key,
        p_target_status: authoritative.state,
        p_amount_minor: attempt.amount_minor,
        p_currency: attempt.currency,
        p_provider_reference: authoritative.providerReference,
        p_provider_event_inbox_id: event.id,
      });
      if (reconcileError) throw reconcileError;
      completed += 1;
    } catch (processingError) {
      try {
        await failInboxEvent(
          event.id,
          workerId,
          "PAYMENT_RECONCILIATION_FAILED",
        );
      } catch (leaseError) {
        logger.warn({
          correlationId: event.correlation_id,
          event: "payment.webhook.lease-release",
          actorClass: "service",
          outcome: "deferred",
          metadata: {
            provider: event.provider,
            errorCode:
              leaseError instanceof Error
                ? leaseError.name
                : "PROVIDER_EVENT_LEASE_LOST",
          },
        });
      }
      logger.error({
        correlationId: event.correlation_id,
        event: "payment.webhook.process",
        actorClass: "service",
        outcome: "failed",
        metadata: {
          provider: event.provider,
          errorCode:
            processingError instanceof Error
              ? processingError.name
              : "UNKNOWN_PAYMENT_EVENT_ERROR",
        },
      });
      failed += 1;
    }
  }
  const result = { claimed: events.length, completed, failed };
  const durationMs = Math.round(performance.now() - startedAt);
  logger.info({
    correlationId: randomUUID(),
    event: "payment.webhook.process",
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
          job: "payment_reconciliation",
          outcome: failed > 0 ? "failed" : "succeeded",
        },
      }),
    },
  });
  return result;
}
