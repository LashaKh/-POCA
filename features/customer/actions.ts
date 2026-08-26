"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { isAppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import {
  customerAddressSchema,
  customerPreferencesSchema,
  customerPrivacySchema,
  deleteCustomerAddressSchema,
} from "./schema";

export type CustomerCommandState = CommandResult<{ changed: true }> | undefined;

function invalid(correlationId: string): CustomerCommandState {
  return commandFailure(
    {
      code: "INVALID_INPUT",
      messageKey: "account.actionFailed",
      retryable: false,
    },
    correlationId,
  );
}

export async function saveCustomerAddressAction(
  _previous: CustomerCommandState,
  formData: FormData,
): Promise<CustomerCommandState> {
  const correlationId = randomUUID();
  const parsed = customerAddressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await createServerSupabaseClient();
  const result = await client.rpc("save_customer_address", {
    p_address_id:
      parsed.data.addressId ?? "00000000-0000-0000-0000-000000000000",
    p_label: parsed.data.label,
    p_full_name: parsed.data.fullName,
    p_organization: parsed.data.organization ?? "",
    p_line1: parsed.data.line1,
    p_line2: parsed.data.line2 ?? "",
    p_city: parsed.data.city,
    p_region: parsed.data.region ?? "",
    p_postal_code: parsed.data.postalCode ?? "",
    p_country_code: parsed.data.countryCode,
    p_phone: parsed.data.phone ?? "",
    p_instructions: parsed.data.instructions ?? "",
    p_is_default: parsed.data.isDefault,
    p_expected_version: parsed.data.expectedVersion ?? 0,
  });
  if (result.error) {
    return commandFailure(
      {
        code: "VERSION_CONFLICT",
        messageKey: "account.actionFailed",
        retryable: true,
      },
      correlationId,
    );
  }
  return commandSuccess({ changed: true }, correlationId);
}

export async function deleteCustomerAddressAction(formData: FormData) {
  const parsed = deleteCustomerAddressSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return;
  const client = await createServerSupabaseClient();
  await client.rpc("delete_customer_address", {
    p_address_id: parsed.data.addressId,
    p_expected_version: parsed.data.expectedVersion,
  });
  revalidatePath(`/${parsed.data.locale}/account/addresses`);
}

export async function saveCustomerPreferencesAction(
  _previous: CustomerCommandState,
  formData: FormData,
): Promise<CustomerCommandState> {
  const correlationId = randomUUID();
  const parsed = customerPreferencesSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return invalid(correlationId);
  const client = await createServerSupabaseClient();
  const claims = await client.auth.getClaims();
  const profileId = claims.data?.claims?.sub;
  if (typeof profileId !== "string") return invalid(correlationId);
  const update = await client
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      locale: parsed.data.locale,
      display_currency: parsed.data.displayCurrency,
    })
    .eq("id", profileId);
  if (update.error) return invalid(correlationId);
  const consent = await client.from("consent_records").insert({
    profile_id: profileId,
    purpose: "marketing",
    choice: parsed.data.marketingChoice,
    disclosure_version: "account-preferences-v1",
    locale: parsed.data.locale,
    source: "account-settings",
  });
  if (consent.error) return invalid(correlationId);
  revalidatePath(`/${parsed.data.locale}/account/settings`);
  return commandSuccess({ changed: true }, correlationId);
}

export async function requestCustomerPrivacyAction(
  _previous: CustomerCommandState,
  formData: FormData,
): Promise<CustomerCommandState> {
  const correlationId = randomUUID();
  const parsed = customerPrivacySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(correlationId);
  const client = await createServerSupabaseClient();
  const result = await client.rpc("request_customer_privacy", {
    p_request_type: parsed.data.requestType,
    p_reason: parsed.data.reason,
  });
  if (result.error) {
    return commandFailure(
      {
        code: "VERSION_CONFLICT",
        messageKey: "account.privacyAlreadyOpen",
        retryable: false,
      },
      correlationId,
    );
  }
  revalidatePath(`/${parsed.data.locale}/account/settings`);
  return commandSuccess({ changed: true }, correlationId);
}

export async function revokeCustomerSessionAction(formData: FormData) {
  const localeValue = formData.get("locale");
  const authSessionId = formData.get("authSessionId");
  if (!isAppLocale(localeValue) || typeof authSessionId !== "string") return;
  const client = await createServerSupabaseClient();
  const claims = await client.auth.getClaims();
  const profileId = claims.data?.claims?.sub;
  if (typeof profileId !== "string") return;
  await client
    .from("app_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: "Customer revoked session",
    })
    .eq("profile_id", profileId)
    .eq("auth_session_id", authSessionId);
  revalidatePath(`/${localeValue}/account/settings`);
}
