import "server-only";

import { getViewerOrder } from "@/features/orders/queries";
import type { AppLocale } from "@/i18n/routing";
import { createPaymentProvider } from "@/lib/providers/registry";
import { sha256 } from "@/features/orders/guest-proof";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { logger } from "@/lib/observability/logger";
import { randomUUID } from "node:crypto";

const reconcilable = new Set([
  "authorized",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "uncertain",
]);

export async function getHostedPaymentReturn(
  reference: string,
  locale: AppLocale,
) {
  const owned = await getViewerOrder(reference, locale);
  if (!owned || owned.order.payment_method !== "hosted_payment")
    return undefined;
  const attempt = owned.payment;
  if (!attempt?.provider_reference) return owned;
  try {
    const provider = createPaymentProvider();
    if (provider.name !== attempt.provider) return owned;
    const status = await provider.getPayment(attempt.provider_reference);
    if (!reconcilable.has(status.state)) return owned;
    const eventKey = `return:${attempt.provider_reference}:${status.state}`;
    const client = createServiceSupabaseClient();
    const { data: inbox, error: inboxError } = await client.rpc(
      "record_provider_event",
      {
        p_provider: provider.name,
        p_event_key: eventKey,
        p_event_type: "payment.return-status",
        p_subject_reference: attempt.provider_reference,
        p_payload_hash: sha256(
          JSON.stringify({
            reference: attempt.provider_reference,
            state: status.state,
          }),
        ),
        p_signature_valid: true,
        p_safe_metadata: { source: "authoritative-return-check" },
      },
    );
    if (inboxError) throw inboxError;
    const { error: reconcileError } = await client.rpc("reconcile_payment", {
      p_order_id: owned.order.id,
      p_provider_event_key: eventKey,
      p_target_status: status.state,
      p_amount_minor: attempt.amount_minor,
      p_currency: attempt.currency,
      p_provider_reference: attempt.provider_reference,
      p_provider_event_inbox_id: inbox.id,
    });
    if (reconcileError) throw reconcileError;
    return (await getViewerOrder(reference, locale)) ?? owned;
  } catch (error) {
    logger.warn({
      correlationId: randomUUID(),
      event: "payment.return.refresh",
      actorClass: "guest",
      outcome: "deferred",
      metadata: {
        orderId: owned.order.id,
        errorCode: error instanceof Error ? error.name : "UNKNOWN_RETURN_ERROR",
      },
    });
    return owned;
  }
}
