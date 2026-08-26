import "server-only";

import { createHash } from "node:crypto";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { CommandError } from "@/lib/validation/command-result";

export const rateLimitPolicies = {
  authSignIn: { scope: "auth-sign-in", limit: 10, windowSeconds: 900 },
  authSignUp: { scope: "customer-sign-up", limit: 5, windowSeconds: 3600 },
  authRecovery: { scope: "account-recovery", limit: 5, windowSeconds: 3600 },
  contactSubmit: { scope: "contact-submit", limit: 5, windowSeconds: 900 },
  uploadAuthorize: {
    scope: "upload-authorize",
    limit: 120,
    windowSeconds: 3600,
  },
  checkoutReview: { scope: "checkout-review", limit: 30, windowSeconds: 600 },
  checkoutAccept: { scope: "checkout-accept", limit: 10, windowSeconds: 600 },
  quoteSubmit: { scope: "manual-quote-submit", limit: 8, windowSeconds: 3600 },
  returnSubmit: { scope: "return-submit", limit: 8, windowSeconds: 3600 },
  paymentEvent: { scope: "payment-event", limit: 600, windowSeconds: 60 },
  emailProviderEvent: {
    scope: "email-provider-event",
    limit: 600,
    windowSeconds: 60,
  },
  newsletterSubscribe: {
    scope: "newsletter-subscribe",
    limit: 5,
    windowSeconds: 3600,
  },
  newsletterWithdraw: {
    scope: "newsletter-withdraw",
    limit: 10,
    windowSeconds: 3600,
  },
  exposedWrite: { scope: "exposed-write", limit: 120, windowSeconds: 900 },
} as const;

export type RateLimitPolicyKey = keyof typeof rateLimitPolicies;

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function hashRateLimitSubject(
  scope: string,
  subject: string,
  pepper: string,
) {
  if (pepper.length < 20) {
    throw new RangeError("Rate-limit pepper is not configured.");
  }

  return createHash("sha256")
    .update(scope)
    .update("\0")
    .update(subject)
    .update("\0")
    .update(pepper)
    .digest("hex");
}

export async function consumeRateLimit({
  scope,
  subjectHash,
  limit,
  windowSeconds,
}: {
  scope: string;
  subjectHash: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitDecision> {
  const client = createServiceSupabaseClient();
  const { data, error } = await client.rpc("consume_rate_limit", {
    p_operation_scope: scope,
    p_subject_hash: subjectHash,
    p_request_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) throw error;
  const decision = data.at(0);
  if (!decision) throw new Error("Rate-limit command returned no decision.");

  return {
    allowed: decision.allowed,
    remaining: decision.remaining,
    retryAfterSeconds: decision.retry_after_seconds,
  };
}

export function consumePolicyRateLimit({
  policy,
  subjectHash,
}: {
  policy: RateLimitPolicyKey;
  subjectHash: string;
}) {
  const configuration = rateLimitPolicies[policy];
  return consumeRateLimit({ ...configuration, subjectHash });
}

export function rateLimitCommandError(
  decision: RateLimitDecision,
  messageKey: string,
): CommandError {
  return {
    code: "RATE_LIMITED",
    messageKey,
    retryable: true,
    retryAfterSeconds: Math.max(decision.retryAfterSeconds, 1),
  };
}

export function rateLimitResponse(decision: RateLimitDecision) {
  return new Response(null, {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": String(Math.max(decision.retryAfterSeconds, 1)),
    },
  });
}
