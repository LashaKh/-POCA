import "server-only";

import { createHash } from "node:crypto";

import { getServerEnvironment } from "@/lib/env/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { recordVerifiedPaymentCallback } from "./webhook-service";

export async function approveFixturePayment(providerReference: string) {
  const environment = getServerEnvironment();
  if (environment.PAYMENT_PROVIDER_MODE !== "fixture") return undefined;

  const client = createServiceSupabaseClient();
  const { data: attempt, error: attemptError } = await client
    .from("payment_attempts")
    .select("order_id,amount_minor,currency")
    .eq("provider", "fixture")
    .eq("provider_reference", providerReference)
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attempt) return undefined;

  const eventKey = `fixture:${providerReference}`;
  const inbox = await recordVerifiedPaymentCallback({
    provider: "fixture",
    providerReference,
    eventKey,
    eventType: "payment.updated",
    payloadHash: createHash("sha256")
      .update(JSON.stringify({ paymentId: providerReference, state: "paid" }))
      .digest("hex"),
    safeMetadata: { source: "fixture-approval" },
  });
  const { error: reconcileError } = await client.rpc("reconcile_payment", {
    p_order_id: attempt.order_id,
    p_provider_event_key: eventKey,
    p_target_status: "paid",
    p_amount_minor: attempt.amount_minor,
    p_currency: attempt.currency,
    p_provider_reference: providerReference,
    p_provider_event_inbox_id: inbox.id,
  });
  if (reconcileError) throw reconcileError;

  const { data: order, error: orderError } = await client
    .from("orders")
    .select("reference,locale")
    .eq("id", attempt.order_id)
    .maybeSingle();
  if (orderError) throw orderError;
  return order ?? undefined;
}
