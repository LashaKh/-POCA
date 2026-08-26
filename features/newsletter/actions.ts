"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { ensurePrivacySubject } from "@/features/consent/subject";
import { sha256 } from "@/features/orders/guest-proof";
import {
  consumePolicyRateLimit,
  rateLimitCommandError,
} from "@/lib/security/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { newsletterProofCookieName } from "./proof";
import {
  newsletterSubscriptionSchema,
  newsletterWithdrawalSchema,
} from "./schema";

export type NewsletterActionState =
  | CommandResult<{ status: "subscribed" | "withdrawn" }>
  | undefined;

export async function subscribeNewsletterAction(
  _previous: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const correlationId = randomUUID();
  const parsed = newsletterSubscriptionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    return commandFailure(
      { code: "INVALID_INPUT", messageKey: "content.failed", retryable: false },
      correlationId,
    );
  const { subjectHash } = await ensurePrivacySubject();
  const rateLimit = await consumePolicyRateLimit({
    policy: "newsletterSubscribe",
    subjectHash,
  });
  if (!rateLimit.allowed)
    return commandFailure(
      rateLimitCommandError(rateLimit, "content.failed"),
      correlationId,
    );
  const cookieStore = await cookies();
  const cookieName = newsletterProofCookieName(parsed.data.email);
  const proof =
    cookieStore.get(cookieName)?.value ?? randomBytes(32).toString("base64url");
  const client = createServiceSupabaseClient();
  const result = await client.rpc("subscribe_newsletter", {
    p_email: parsed.data.email,
    p_guest_subject_hash: subjectHash,
    p_manage_proof_hash: sha256(proof),
    p_locale: parsed.data.locale,
    p_disclosure_version: parsed.data.disclosureVersion,
  });
  if (result.error)
    return commandFailure(
      { code: "INTERNAL_ERROR", messageKey: "content.failed", retryable: true },
      correlationId,
    );
  cookieStore.set(cookieName, proof, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.DEPLOY_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return commandSuccess({ status: "subscribed" }, correlationId);
}

export async function withdrawNewsletterAction(
  _previous: NewsletterActionState,
  formData: FormData,
): Promise<NewsletterActionState> {
  const correlationId = randomUUID();
  const parsed = newsletterWithdrawalSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    return commandFailure(
      { code: "INVALID_INPUT", messageKey: "content.failed", retryable: false },
      correlationId,
    );
  const { subjectHash } = await ensurePrivacySubject();
  const rateLimit = await consumePolicyRateLimit({
    policy: "newsletterWithdraw",
    subjectHash,
  });
  if (!rateLimit.allowed) {
    return commandFailure(
      rateLimitCommandError(rateLimit, "content.failed"),
      correlationId,
    );
  }
  const proof = (await cookies()).get(
    newsletterProofCookieName(parsed.data.email),
  )?.value;
  if (proof) {
    const client = createServiceSupabaseClient();
    const result = await client.rpc("withdraw_newsletter", {
      p_email: parsed.data.email,
      p_manage_proof_hash: sha256(proof),
      p_locale: parsed.data.locale,
    });
    if (result.error)
      return commandFailure(
        {
          code: "INTERNAL_ERROR",
          messageKey: "content.failed",
          retryable: true,
        },
        correlationId,
      );
  }
  return commandSuccess({ status: "withdrawn" }, correlationId);
}
