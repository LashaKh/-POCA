"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAppLocale } from "@/i18n/routing";
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

export type RecoveryState = CommandResult<{ requested: true }> | undefined;

const requestSchema = z.object({
  locale: z.string().refine(isAppLocale),
  email: z.email().max(254),
});

export async function requestRecoveryAction(
  _previous: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const correlationId = randomUUID();
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "auth.recoveryGeneric",
        retryable: false,
      },
      correlationId,
    );
  }
  const client = await createServerSupabaseClient();
  const environment = getServerEnvironment();
  const email = parsed.data.email.toLowerCase();
  const decision = await consumePolicyRateLimit({
    policy: "authRecovery",
    subjectHash: hashRateLimitSubject(
      "account-recovery",
      email,
      environment.SUPABASE_SERVICE_ROLE_KEY,
    ),
  });
  if (!decision.allowed) {
    return commandSuccess({ requested: true }, correlationId);
  }
  const redirectTo = `${environment.SITE_URL ?? "http://127.0.0.1:3000"}/${parsed.data.locale}/auth/callback?next=/auth/recovery?mode=update`;
  // The response is intentionally generic whether or not the account exists.
  await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return commandSuccess({ requested: true }, correlationId);
}

const updateSchema = z
  .object({
    locale: z.string().refine(isAppLocale),
    password: z.string().min(14).max(200),
    confirmation: z.string().min(14).max(200),
  })
  .refine((value) => value.password === value.confirmation);

export async function updateRecoveredPasswordAction(
  _previous: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const correlationId = randomUUID();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "auth.recoveryInvalid",
        retryable: false,
      },
      correlationId,
    );
  }
  const client = await createServerSupabaseClient();
  const result = await client.auth.updateUser({
    password: parsed.data.password,
  });
  if (result.error) {
    return commandFailure(
      {
        code: "AUTH_REQUIRED",
        messageKey: "auth.recoveryInvalid",
        retryable: false,
      },
      correlationId,
    );
  }
  await client.auth.signOut({ scope: "local" });
  redirect(`/${parsed.data.locale}/auth/sign-in?recovered=true`);
}
