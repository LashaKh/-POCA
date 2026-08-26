"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isAppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { isSafeReturnPath } from "./context";
import { registerCurrentSession } from "./session";

export type MfaEnrollState =
  | CommandResult<{ factorId: string; qrCode: string; secret: string }>
  | undefined;
export type MfaVerifyState = CommandResult<{ verified: true }> | undefined;

export async function enrollMfaAction(): Promise<MfaEnrollState> {
  const correlationId = randomUUID();
  const client = await createServerSupabaseClient();
  const result = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "ÉPOCA authenticator",
  });
  if (result.error) {
    return commandFailure(
      {
        code: "MFA_REQUIRED",
        messageKey: "auth.mfaFailed",
        retryable: true,
      },
      correlationId,
    );
  }
  return commandSuccess(
    {
      factorId: result.data.id,
      qrCode: result.data.totp.qr_code,
      secret: result.data.totp.secret,
    },
    correlationId,
  );
}

const verifySchema = z.object({
  factorId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
  locale: z.string().refine(isAppLocale),
  returnTo: z.string().max(500),
});

export async function verifyMfaAction(
  _previous: MfaVerifyState,
  formData: FormData,
): Promise<MfaVerifyState> {
  const correlationId = randomUUID();
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "auth.mfaInvalid",
        retryable: false,
      },
      correlationId,
    );
  }
  const client = await createServerSupabaseClient();
  const result = await client.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code: parsed.data.code,
  });
  if (result.error) {
    return commandFailure(
      {
        code: "MFA_REQUIRED",
        messageKey: "auth.mfaInvalid",
        retryable: true,
      },
      correlationId,
    );
  }
  await client.auth.refreshSession();
  await registerCurrentSession(client);
  const returnTo = isSafeReturnPath(parsed.data.returnTo)
    ? parsed.data.returnTo
    : "/admin";
  redirect(`/${parsed.data.locale}${returnTo}`);
}
