"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAppLocale } from "@/i18n/routing";
import { getServerEnvironment } from "@/lib/env/server";
import { logger } from "@/lib/observability/logger";
import { recordMetric } from "@/lib/observability/metrics";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  consumePolicyRateLimit,
  hashRateLimitSubject,
  rateLimitCommandError,
} from "@/lib/security/rate-limit";
import {
  commandFailure,
  type CommandResult,
} from "@/lib/validation/command-result";

import { isSafeReturnPath, resolveActorContext } from "./context";
import { canBypassLocalOwnerMfa } from "./authorization";
import { registerCurrentSession } from "./session";
import { mergeCurrentGuestIntoCustomer } from "@/features/wishlist/merge";

const signInSchema = z.object({
  locale: z.string().refine(isAppLocale),
  email: z.email().max(254),
  password: z.string().min(12).max(200),
  returnTo: z.string().max(500).default("/account"),
});

export type SignInState = CommandResult<{ signedIn: true }> | undefined;

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const startedAt = performance.now();
  const correlationId = randomUUID();
  const recordOutcome = (outcome: "succeeded" | "denied" | "failed") =>
    logger.info({
      correlationId,
      event: "auth.sign-in",
      actorClass: "anonymous",
      outcome,
      durationMs: Math.round(performance.now() - startedAt),
      metadata: {
        metric: recordMetric({
          name: "command_duration_ms",
          type: "histogram",
          value: Math.round(performance.now() - startedAt),
          labels: { command: "auth_sign_in", outcome },
        }),
      },
    });
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    recordOutcome("denied");
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "auth.invalidCredentials",
        retryable: false,
      },
      correlationId,
    );
  }
  const environment = getServerEnvironment();
  const email = parsed.data.email.toLowerCase();
  const rateLimit = await consumePolicyRateLimit({
    policy: "authSignIn",
    subjectHash: hashRateLimitSubject(
      "auth-sign-in",
      email,
      environment.SUPABASE_SERVICE_ROLE_KEY,
    ),
  });
  if (!rateLimit.allowed) {
    recordOutcome("denied");
    return commandFailure(
      rateLimitCommandError(rateLimit, "auth.invalidCredentials"),
      correlationId,
    );
  }
  const client = await createServerSupabaseClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error) {
    recordOutcome("denied");
    return commandFailure(
      {
        code: "AUTH_REQUIRED",
        messageKey: "auth.invalidCredentials",
        retryable: false,
      },
      correlationId,
    );
  }
  const { data: claimsData, error: claimsError } =
    await client.auth.getClaims();
  const profileId = claimsData?.claims?.sub;
  if (claimsError || typeof profileId !== "string") {
    await client.auth.signOut({ scope: "local" });
    recordOutcome("failed");
    return commandFailure(
      {
        code: "INTERNAL_ERROR",
        messageKey: "auth.sessionRegistrationFailed",
        retryable: true,
      },
      correlationId,
    );
  }
  const profile = await client
    .from("profiles")
    .select("id,profile_kind")
    .eq("id", profileId)
    .maybeSingle();
  if (profile.error) throw profile.error;
  if (!profile.data) {
    const initialized = await client.rpc("initialize_customer_profile", {
      p_display_name: undefined,
      p_locale: parsed.data.locale,
      p_currency: "GEL",
    });
    if (initialized.error) {
      await client.auth.signOut({ scope: "local" });
      recordOutcome("failed");
      return commandFailure(
        {
          code: "INTERNAL_ERROR",
          messageKey: "auth.sessionRegistrationFailed",
          retryable: true,
        },
        correlationId,
      );
    }
  }
  let authSessionId: string;
  try {
    const registeredSession = await registerCurrentSession(client);
    authSessionId = registeredSession.auth_session_id;
  } catch {
    await client.auth.signOut({ scope: "local" });
    recordOutcome("failed");
    return commandFailure(
      {
        code: "INTERNAL_ERROR",
        messageKey: "auth.sessionRegistrationFailed",
        retryable: true,
      },
      correlationId,
    );
  }
  const returnTo = isSafeReturnPath(parsed.data.returnTo)
    ? parsed.data.returnTo
    : "/account";
  const { data: assurance } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel();
  const context = await resolveActorContext(client, authSessionId);
  if (context.kind === "customer") {
    await mergeCurrentGuestIntoCustomer(context.profileId, parsed.data.locale);
  }
  recordOutcome("succeeded");
  if (
    !canBypassLocalOwnerMfa(context) &&
    (assurance?.nextLevel === "aal2" ||
      (context.kind === "staff" && context.role === "owner"))
  ) {
    redirect(
      `/${parsed.data.locale}/auth/mfa?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }
  redirect(`/${parsed.data.locale}${returnTo}`);
}

export async function signOutAction(formData: FormData) {
  const localeValue = formData.get("locale");
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  const client = await createServerSupabaseClient();
  await client.rpc("revoke_current_session", {
    p_reason: "User signed out",
  });
  await client.auth.signOut({ scope: "local" });
  redirect(`/${locale}/auth/signed-out`);
}

export async function signOutOtherSessionsAction(formData: FormData) {
  const localeValue = formData.get("locale");
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  const client = await createServerSupabaseClient();
  const { data: claims } = await client.auth.getClaims();
  const profileId = claims?.claims?.sub;
  const sessionId = claims?.claims?.session_id;
  if (typeof profileId !== "string" || typeof sessionId !== "string") {
    redirect(`/${locale}/auth/sign-in`);
  }
  await client.rpc("revoke_app_sessions", {
    p_profile_id: profileId,
    p_keep_auth_session_id: sessionId,
    p_reason: "User revoked other sessions",
  });
  await client.auth.signOut({ scope: "others" });
  const returnTo = formData.get("returnTo");
  redirect(
    `/${locale}${typeof returnTo === "string" && isSafeReturnPath(returnTo) ? returnTo : "/admin"}`,
  );
}

export async function signOutAllSessionsAction(formData: FormData) {
  const localeValue = formData.get("locale");
  const locale = isAppLocale(localeValue) ? localeValue : "en";
  const client = await createServerSupabaseClient();
  const { data: claims } = await client.auth.getClaims();
  const profileId = claims?.claims?.sub;
  if (typeof profileId !== "string") redirect(`/${locale}/auth/sign-in`);
  await client.rpc("revoke_app_sessions", {
    p_profile_id: profileId,
    p_keep_auth_session_id: undefined,
    p_reason: "User signed out every session",
  });
  await client.auth.signOut({ scope: "global" });
  redirect(`/${locale}/auth/signed-out`);
}
