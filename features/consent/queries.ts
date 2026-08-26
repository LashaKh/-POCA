import "server-only";

import { sha256 } from "@/features/orders/guest-proof";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { readConsentChoiceCookie, readPrivacySubject } from "./subject";

export async function getCurrentConsentChoices() {
  const cached = await readConsentChoiceCookie();
  const subject = await readPrivacySubject();
  if (!subject) return cached;
  const client = createServiceSupabaseClient();
  const result = await client.rpc("read_visitor_consent", {
    p_guest_subject_hash: sha256(subject),
  });
  if (
    result.error ||
    !result.data ||
    typeof result.data !== "object" ||
    Array.isArray(result.data)
  )
    return cached;
  const records = result.data as Record<string, { choice?: string }>;
  return {
    ...cached,
    ...(records.analytics?.choice
      ? { analytics: records.analytics.choice }
      : {}),
    ...(records.preferences?.choice
      ? { preferences: records.preferences.choice }
      : {}),
  };
}

export async function getCurrentAnalyticsConsent() {
  const choices = await getCurrentConsentChoices();
  return choices.analytics === "granted"
    ? "granted"
    : choices.analytics === "withdrawn"
      ? "withdrawn"
      : "refused";
}
