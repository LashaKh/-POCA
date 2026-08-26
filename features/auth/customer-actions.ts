"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";

import { getServerEnvironment } from "@/lib/env/server";
import {
  consumePolicyRateLimit,
  hashRateLimitSubject,
} from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";
import { mergeCurrentGuestIntoCustomer } from "@/features/wishlist/merge";

import { isSafeReturnPath } from "./context";
import { customerSignUpSchema } from "./customer-schema";
import { registerCurrentSession } from "./session";

export type CustomerSignUpState =
  | CommandResult<{ verificationRequired: true }>
  | undefined;

export async function signUpCustomerAction(
  _previous: CustomerSignUpState,
  formData: FormData,
): Promise<CustomerSignUpState> {
  const correlationId = randomUUID();
  const parsed = customerSignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "auth.signUpInvalid",
        retryable: false,
      },
      correlationId,
    );
  }
  const environment = getServerEnvironment();
  const normalizedEmail = parsed.data.email.toLowerCase();
  const rateLimit = await consumePolicyRateLimit({
    policy: "authSignUp",
    subjectHash: hashRateLimitSubject(
      "customer-sign-up",
      normalizedEmail,
      environment.SUPABASE_SERVICE_ROLE_KEY,
    ),
  });
  if (!rateLimit.allowed) {
    return commandFailure(
      {
        code: "RATE_LIMITED",
        messageKey: "auth.signUpGeneric",
        retryable: true,
      },
      correlationId,
    );
  }

  const client = await createServerSupabaseClient();
  const returnTo = isSafeReturnPath(parsed.data.returnTo)
    ? parsed.data.returnTo
    : "/account";
  const siteUrl = environment.SITE_URL ?? "http://127.0.0.1:3000";
  const result = await client.auth.signUp({
    email: normalizedEmail,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/${parsed.data.locale}/auth/callback?next=${encodeURIComponent(`${returnTo}?verified=1`)}`,
      data: { display_name: parsed.data.displayName },
    },
  });
  if (result.error) {
    return commandSuccess({ verificationRequired: true }, correlationId);
  }
  if (!result.data.session) {
    return commandSuccess({ verificationRequired: true }, correlationId);
  }

  const profile = await client.rpc("initialize_customer_profile", {
    p_display_name: parsed.data.displayName,
    p_locale: parsed.data.locale,
    p_currency: "GEL",
  });
  if (profile.error) {
    await client.auth.signOut({ scope: "local" });
    return commandFailure(
      {
        code: "INTERNAL_ERROR",
        messageKey: "auth.sessionRegistrationFailed",
        retryable: true,
      },
      correlationId,
    );
  }
  if (parsed.data.marketingAccepted) {
    await client.from("consent_records").insert({
      profile_id: profile.data.id,
      purpose: "marketing",
      choice: "granted",
      disclosure_version: "customer-sign-up-v1",
      locale: parsed.data.locale,
      source: "customer-sign-up",
    });
  }
  await registerCurrentSession(client);
  await mergeCurrentGuestIntoCustomer(profile.data.id, parsed.data.locale);
  redirect(`/${parsed.data.locale}${returnTo}?welcome=1`);
}
