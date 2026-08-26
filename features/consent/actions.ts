"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { consentPreferenceSchema } from "./schema";
import { ensurePrivacySubject, persistConsentChoiceCookie } from "./subject";

export type ConsentActionState = CommandResult<{ changed: true }> | undefined;

export async function saveConsentPreferencesAction(
  _previous: ConsentActionState,
  formData: FormData,
): Promise<ConsentActionState> {
  const correlationId = randomUUID();
  const parsed = consentPreferenceSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return commandFailure(
      { code: "INVALID_INPUT", messageKey: "content.failed", retryable: false },
      correlationId,
    );
  }
  const { subjectHash } = await ensurePrivacySubject();
  const client = createServiceSupabaseClient();
  const result = await client.rpc("record_visitor_consent", {
    p_guest_subject_hash: subjectHash,
    p_locale: parsed.data.locale,
    p_choices: {
      analytics: parsed.data.analytics,
      preferences: parsed.data.preferences,
    },
    p_disclosure_versions: {
      analytics: parsed.data.analyticsDisclosureVersion,
      preferences: parsed.data.preferencesDisclosureVersion,
    },
    p_preference_metadata: parsed.data.currency
      ? { currency: parsed.data.currency }
      : {},
    p_source: "preference-center",
  });
  if (result.error) {
    return commandFailure(
      { code: "INTERNAL_ERROR", messageKey: "content.failed", retryable: true },
      correlationId,
    );
  }
  await persistConsentChoiceCookie({
    analytics: parsed.data.analytics,
    preferences: parsed.data.preferences,
  });
  revalidatePath(`/${parsed.data.locale}`, "layout");
  return commandSuccess({ changed: true }, correlationId);
}
