"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";

import { sha256 } from "@/features/orders/guest-proof";
import { ensurePrivacySubject } from "@/features/consent/subject";
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

import { contactMessageFingerprint, contactProofCookieName } from "./proof";
import { contactSubmissionSchema } from "./schema";

export type ContactActionState =
  | CommandResult<{ reference: string }>
  | undefined;

export async function submitContactMessageAction(
  _previous: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const correlationId = randomUUID();
  const parsed = contactSubmissionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success)
    return commandFailure(
      { code: "INVALID_INPUT", messageKey: "content.failed", retryable: false },
      correlationId,
    );
  const { subjectHash } = await ensurePrivacySubject();
  const rateLimit = await consumePolicyRateLimit({
    policy: "contactSubmit",
    subjectHash,
  });
  if (!rateLimit.allowed)
    return commandFailure(
      rateLimitCommandError(rateLimit, "content.failed"),
      correlationId,
    );
  const proof = randomBytes(32).toString("base64url");
  const value = parsed.data;
  const client = createServiceSupabaseClient();
  const result = await client.rpc("submit_contact_message", {
    p_guest_subject_hash: subjectHash,
    p_guest_proof_hash: sha256(proof),
    p_locale: value.locale,
    p_contact_email: value.email,
    p_full_name: value.fullName,
    p_subject: value.subject,
    p_message: value.message,
    p_message_fingerprint: contactMessageFingerprint(value),
    p_order_reference: value.orderReference ?? "",
    p_disclosure_version: value.disclosureVersion,
    p_idempotency_key_hash: sha256(value.idempotencyKey),
  });
  if (result.error)
    return commandFailure(
      { code: "INTERNAL_ERROR", messageKey: "content.failed", retryable: true },
      correlationId,
    );
  (await cookies()).set(contactProofCookieName(result.data.reference), proof, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.DEPLOY_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return commandSuccess({ reference: result.data.reference }, correlationId);
}
