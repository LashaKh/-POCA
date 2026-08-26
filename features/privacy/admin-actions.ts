"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAssurance, requireOwner } from "@/features/auth/authorization";
import { resolveActorContext } from "@/features/auth/context";
import { getCurrentAuthSessionId } from "@/features/auth/session";
import { isAppLocale } from "@/i18n/routing";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

export type PrivacyActionState = CommandResult<{ id: string }> | undefined;

const schema = z.object({
  locale: z.string().refine(isAppLocale),
  subjectProfileId: z.uuid(),
  requestType: z.enum(["access", "export", "correction", "deletion"]),
  reason: z.string().trim().min(2).max(500),
  confirmation: z.string().max(240).optional().default(""),
});

export async function requestPrivacyAction(
  _previous: PrivacyActionState,
  formData: FormData,
): Promise<PrivacyActionState> {
  const correlationId = randomUUID();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  const failure = () =>
    commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "admin.security.actionFailed",
        retryable: false,
      },
      correlationId,
    );
  if (!parsed.success) return failure();
  try {
    const client = await createServerSupabaseClient();
    const context = requireOwner(
      await resolveActorContext(client, await getCurrentAuthSessionId(client)),
    );
    requireAssurance(context, "aal2");
    const operationType =
      parsed.data.requestType === "deletion"
        ? "privacy-delete"
        : parsed.data.requestType === "export"
          ? "export-sensitive"
          : undefined;
    if (operationType) {
      const protectedResult = await client.rpc("record_protected_operation", {
        p_operation_type: operationType,
        p_entity_type: "profile",
        p_entity_id: parsed.data.subjectProfileId,
        p_confirmation: parsed.data.confirmation,
        p_reason: parsed.data.reason,
      });
      if (protectedResult.error) return failure();
    }
    const result = await client.rpc("request_privacy_operation", {
      p_subject_profile_id: parsed.data.subjectProfileId,
      p_request_type: parsed.data.requestType,
      p_reason: parsed.data.reason,
    });
    if (result.error) return failure();
    revalidatePath(`/${parsed.data.locale}/admin/settings/privacy`);
    return commandSuccess({ id: result.data.id }, correlationId);
  } catch {
    return failure();
  }
}
