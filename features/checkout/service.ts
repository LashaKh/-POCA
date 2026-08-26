import "server-only";

import { randomUUID } from "node:crypto";

import { readGuestSecret, readGuestSecretHash } from "@/features/cart/guest";
import { captureOrderNotification } from "@/features/operations/outbox";
import { deriveGuestOrderProof, sha256 } from "@/features/orders/guest-proof";
import { getBankTransferMethod } from "@/features/payments/bank-transfer";
import type { AppLocale } from "@/i18n/routing";
import { logger } from "@/lib/observability/logger";
import { recordMetric } from "@/lib/observability/metrics";
import { createPaymentProvider } from "@/lib/providers/registry";
import { getServerEnvironment } from "@/lib/env/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getCustomerContext } from "@/features/customer/context";

import {
  checkoutAcceptanceSchema,
  quoteBreakdownSchema,
  type CheckoutAcceptance,
} from "./schema";

export async function reviewCheckout(input: {
  locale: AppLocale;
  countryCode: string;
  methodCode: string;
}) {
  const secretHash = await readGuestSecretHash();
  if (!secretHash) throw new Error("CART_NOT_FOUND");
  const payment = await getBankTransferMethod(input.locale);
  const hostedPaymentEnabled = createPaymentProvider().available;
  if (!payment.enabled && !hostedPaymentEnabled) {
    throw new Error("PAYMENT_METHOD_DISABLED");
  }
  const client = createServiceSupabaseClient();
  const { data: session, error } = await client.rpc("reserve_guest_checkout", {
    p_secret_hash: secretHash,
    p_country_code: input.countryCode,
    p_method_code: input.methodCode,
  });
  if (error) throw error;
  const { data: quote, error: quoteError } = await client
    .from("delivery_quotes")
    .select("*")
    .eq("id", session.quote_id)
    .single();
  if (quoteError) throw quoteError;
  return {
    session,
    quote: { ...quote, breakdown: quoteBreakdownSchema.parse(quote.breakdown) },
    payment,
    hostedPaymentEnabled,
  };
}

export async function getCheckoutReview(
  locale: AppLocale,
  checkoutSessionId: string,
) {
  const secretHash = await readGuestSecretHash();
  if (!secretHash) return undefined;
  const client = createServiceSupabaseClient();
  const { data: session, error } = await client
    .from("checkout_sessions")
    .select("*,delivery_quotes(*)")
    .eq("id", checkoutSessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session || !session.delivery_quotes) return undefined;
  if (
    session.status !== "reserved" ||
    new Date(session.expires_at).getTime() <= Date.now()
  ) {
    return undefined;
  }
  const { data: cart } = await client
    .from("carts")
    .select("guest_session_id,guest_sessions!inner(secret_hash)")
    .eq("id", session.cart_id)
    .eq("guest_sessions.secret_hash", secretHash)
    .maybeSingle();
  if (!cart) return undefined;
  const payment = await getBankTransferMethod(locale);
  const hostedPaymentEnabled = createPaymentProvider().available;
  return {
    session,
    quote: {
      ...session.delivery_quotes,
      breakdown: quoteBreakdownSchema.parse(session.delivery_quotes.breakdown),
    },
    payment,
    hostedPaymentEnabled,
  };
}

export async function acceptOrder(rawInput: CheckoutAcceptance) {
  const startedAt = performance.now();
  const correlationId = randomUUID();
  const input = checkoutAcceptanceSchema.parse(rawInput);
  const [guestSecret, secretHash, payment] = await Promise.all([
    readGuestSecret(),
    readGuestSecretHash(),
    getBankTransferMethod(input.locale),
  ]);
  if (!guestSecret || !secretHash) throw new Error("GUEST_CONTEXT_NOT_FOUND");
  const paymentProvider = createPaymentProvider();
  if (
    (input.paymentMethod === "bank_transfer" && !payment.enabled) ||
    (input.paymentMethod === "hosted_payment" && !paymentProvider.available)
  ) {
    throw new Error("PAYMENT_METHOD_DISABLED");
  }
  const proof = deriveGuestOrderProof(guestSecret, input.idempotencyKey);
  const requestHash = sha256(
    JSON.stringify({
      checkoutSessionId: input.checkoutSessionId,
      expectedTotalMinor: input.expectedTotalMinor,
      email: input.email.toLowerCase(),
      phone: input.phone,
      address: {
        fullName: input.fullName,
        organization: input.organization,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        instructions: input.instructions,
      },
      termsVersion: input.termsVersion,
      paymentMethod: input.paymentMethod,
    }),
  );
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("accept_guest_order", {
    p_secret_hash: secretHash,
    p_checkout_session_id: input.checkoutSessionId,
    p_expected_total_minor: input.expectedTotalMinor,
    p_accept_changes: input.acceptChanges,
    p_idempotency_key_hash: sha256(input.idempotencyKey),
    p_request_hash: requestHash,
    p_guest_proof_hash: sha256(proof),
    p_contact_email: input.email,
    p_contact_phone: input.phone ?? "",
    p_address: {
      fullName: input.fullName,
      organization: input.organization,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      region: input.region,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      instructions: input.instructions,
    },
    p_payment_method: input.paymentMethod,
    p_terms_version: input.termsVersion,
  });
  if (error) throw error;
  logger.info({
    correlationId,
    event: "checkout.accept",
    actorClass: "guest",
    outcome: "succeeded",
    durationMs: Math.round(performance.now() - startedAt),
    metadata: {
      paymentMethod: input.paymentMethod,
      metric: recordMetric({
        name: "command_duration_ms",
        type: "histogram",
        value: Math.round(performance.now() - startedAt),
        labels: { command: "checkout_accept", outcome: "succeeded" },
      }),
    },
  });
  if (input.paymentMethod === "bank_transfer" && payment.enabled)
    try {
      await captureOrderNotification(data.id, payment);
    } catch (captureError) {
      logger.warn({
        correlationId: randomUUID(),
        event: "order.notification.capture",
        actorClass: "service",
        outcome: "deferred",
        metadata: {
          orderId: data.id,
          errorCode:
            captureError instanceof Error
              ? captureError.name
              : "UNKNOWN_CAPTURE_ERROR",
        },
      });
    }

  if (input.paymentMethod === "hosted_payment") {
    try {
      const environment = getServerEnvironment();
      const siteUrl = environment.SITE_URL ?? "http://127.0.0.1:3000";
      const hosted = await paymentProvider.createPayment({
        orderId: data.id,
        orderReference: data.reference,
        amountMinor: data.total_minor,
        currency: data.currency,
        locale: input.locale,
        returnUrl: `${siteUrl}/${input.locale}/payment/return?reference=${encodeURIComponent(data.reference)}`,
        callbackUrl: `${siteUrl}/api/webhooks/tbc`,
        idempotencyKey: `checkout:${data.id}`,
      });
      const { error: attachError } = await client.rpc("attach_hosted_payment", {
        p_order_id: data.id,
        p_provider: hosted.provider,
        p_provider_reference: hosted.providerReference,
      });
      if (attachError) throw attachError;
      const claimed = await claimAcceptedOrder(data.id, secretHash);
      return { order: data, proof, approvalUrl: hosted.approvalUrl, claimed };
    } catch (providerError) {
      logger.error({
        correlationId: randomUUID(),
        event: "payment.create",
        actorClass: "service",
        outcome: "failed",
        metadata: {
          orderId: data.id,
          errorCode:
            providerError instanceof Error
              ? providerError.name
              : "UNKNOWN_PAYMENT_ERROR",
        },
      });
      const claimed = await claimAcceptedOrder(data.id, secretHash);
      return {
        order: data,
        proof,
        paymentError: "PAYMENT_PROVIDER_UNAVAILABLE" as const,
        claimed,
      };
    }
  }
  const claimed = await claimAcceptedOrder(data.id, secretHash);
  return { order: data, proof, claimed };
}

async function claimAcceptedOrder(orderId: string, secretHash: string) {
  const { context } = await getCustomerContext();
  if (context.kind !== "customer") return false;
  const service = createServiceSupabaseClient();
  const result = await service.rpc("claim_guest_order_for_customer", {
    p_order_id: orderId,
    p_secret_hash: secretHash,
    p_customer_profile_id: context.profileId,
  });
  if (result.error) throw result.error;
  return result.data;
}
