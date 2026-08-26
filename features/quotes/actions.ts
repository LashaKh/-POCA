"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { managerCommandClient } from "@/features/auth/admin-command";
import { readGuestSecretHash } from "@/features/cart/guest";
import { consumePolicyRateLimit } from "@/lib/security/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandErrorCode,
  type CommandResult,
} from "@/lib/validation/command-result";

import { hashManualQuoteProof, manualQuoteProofCookieName } from "./proof";
import {
  manualQuoteInformationSchema,
  manualQuoteResolutionSchema,
  manualQuoteResponseSchema,
  manualQuoteSubmissionSchema,
} from "./schema";

export type QuoteActionState =
  | CommandResult<{ reference: string; id: string }>
  | undefined;

function failure(
  correlationId: string,
  code: CommandErrorCode = "INVALID_INPUT",
) {
  return commandFailure(
    {
      code,
      messageKey: `quotes.errors.${code.toLowerCase()}`,
      retryable: code === "VERSION_CONFLICT" || code === "RATE_LIMITED",
    },
    correlationId,
  );
}

export async function submitManualQuoteAction(
  _previous: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const correlationId = randomUUID();
  const parsed = manualQuoteSubmissionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return failure(correlationId);
  const guestSecretHash = await readGuestSecretHash();
  if (!guestSecretHash) return failure(correlationId, "DELIVERY_UNAVAILABLE");
  const rateLimit = await consumePolicyRateLimit({
    policy: "quoteSubmit",
    subjectHash: guestSecretHash,
  });
  if (!rateLimit.allowed) return failure(correlationId, "RATE_LIMITED");
  const proof = randomBytes(32).toString("hex");
  const value = parsed.data;
  const client = createServiceSupabaseClient();
  const result = await client.rpc("submit_manual_quote", {
    p_secret_hash: guestSecretHash,
    p_quote_proof_hash: hashManualQuoteProof(proof),
    p_country_code: value.countryCode,
    p_contact_email: value.email,
    p_contact_phone: value.phone ?? "",
    p_address: {
      fullName: value.fullName,
      organization: value.organization,
      line1: value.line1,
      line2: value.line2,
      city: value.city,
      region: value.region,
      postalCode: value.postalCode,
      countryCode: value.countryCode,
      instructions: value.instructions,
    },
    p_buyer_note: value.buyerNote ?? "",
    p_idempotency_key_hash: hashManualQuoteProof(value.idempotencyKey),
  });
  if (result.error) return failure(correlationId, "INTERNAL_ERROR");
  const cookieStore = await cookies();
  cookieStore.set(manualQuoteProofCookieName(result.data.reference), proof, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.DEPLOY_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  return commandSuccess(
    { reference: result.data.reference, id: result.data.id },
    correlationId,
  );
}

export async function requestManualQuoteInformationAction(
  _previous: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const correlationId = randomUUID();
  const parsed = manualQuoteInformationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return failure(correlationId);
  const client = await managerCommandClient(
    "commerce.quote.request-information",
  );
  const result = await client.rpc("request_manual_quote_information", {
    p_quote_id: parsed.data.quoteId,
    p_expected_version: parsed.data.expectedVersion,
    p_buyer_message: parsed.data.buyerMessage,
    p_idempotency_key_hash: hashManualQuoteProof(parsed.data.idempotencyKey),
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INTERNAL_ERROR",
    );
  }
  revalidatePath(`/${parsed.data.locale}/admin/quotes/${parsed.data.quoteId}`);
  return commandSuccess(
    { reference: result.data.reference, id: result.data.id },
    correlationId,
  );
}

export async function resolveManualQuoteAction(
  _previous: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const correlationId = randomUUID();
  const parsed = manualQuoteResolutionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return failure(correlationId);
  const value = parsed.data;
  const client = await managerCommandClient("commerce.quote.resolve");
  const result = await client.rpc("resolve_manual_quote", {
    p_quote_id: value.quoteId,
    p_expected_version: value.expectedVersion,
    p_amount_minor: value.amountMinor,
    p_currency: value.currency,
    p_method_i18n: {
      ka: value.methodKa,
      en: value.methodEn,
      de: value.methodDe,
      ru: value.methodRu,
    },
    p_estimate_min_days: value.estimateMinDays,
    p_estimate_max_days: value.estimateMaxDays,
    p_customs_snapshot: {
      responsibility: value.customsResponsibility,
      legalStatus: value.legalStatus,
    },
    p_expires_at: value.expiresAt,
    p_staff_note: value.staffNote ?? "",
    p_buyer_message: value.buyerMessage,
    p_idempotency_key_hash: hashManualQuoteProof(value.idempotencyKey),
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INTERNAL_ERROR",
    );
  }
  revalidatePath(`/${value.locale}/admin/quotes/${value.quoteId}`);
  revalidatePath(`/${value.locale}/admin/quotes`);
  return commandSuccess(
    { reference: result.data.reference, id: result.data.id },
    correlationId,
  );
}

export async function respondManualQuoteAction(
  _previous: QuoteActionState,
  formData: FormData,
): Promise<QuoteActionState> {
  const correlationId = randomUUID();
  const parsed = manualQuoteResponseSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return failure(correlationId);
  const cookieStore = await cookies();
  const proof = cookieStore.get(
    manualQuoteProofCookieName(parsed.data.reference),
  )?.value;
  if (!proof) return failure(correlationId, "DELIVERY_UNAVAILABLE");
  const client = createServiceSupabaseClient();
  const result = await client.rpc("respond_manual_quote", {
    p_quote_id: parsed.data.quoteId,
    p_proof_hash: hashManualQuoteProof(proof),
    p_accept: parsed.data.response === "accept",
    p_expected_version: parsed.data.expectedVersion,
    p_idempotency_key_hash: hashManualQuoteProof(parsed.data.idempotencyKey),
  });
  if (result.error) {
    return failure(
      correlationId,
      result.error.code === "40001" ? "VERSION_CONFLICT" : "INTERNAL_ERROR",
    );
  }
  revalidatePath(`/${parsed.data.locale}/quote/${parsed.data.reference}`);
  return commandSuccess(
    { reference: result.data.reference, id: result.data.id },
    correlationId,
  );
}
