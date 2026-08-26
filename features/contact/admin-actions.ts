"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { managerCommandClient } from "@/features/auth/admin-command";
import { sha256 } from "@/features/orders/guest-proof";
import { locales } from "@/i18n/routing";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

const transitionSchema = z.object({
  locale: z.enum(locales),
  contactSubmissionId: z.uuid(),
  expectedVersion: z.coerce.number().int().positive(),
  targetStatus: z.enum(["in_review", "responded", "closed", "spam"]),
  safeNote: z.string().trim().min(2).max(1000),
});

export type ContactAdminActionState =
  | CommandResult<{ changed: true }>
  | undefined;

export async function transitionContactMessageAction(
  _previous: ContactAdminActionState,
  formData: FormData,
): Promise<ContactAdminActionState> {
  const correlationId = randomUUID();
  const parsed = transitionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "admin.content.errors.failed",
        retryable: false,
      },
      correlationId,
    );
  const client = await managerCommandClient("contact.message.transition");
  const result = await client.rpc("transition_contact_message", {
    p_contact_submission_id: parsed.data.contactSubmissionId,
    p_expected_version: parsed.data.expectedVersion,
    p_target_status: parsed.data.targetStatus,
    p_safe_note: parsed.data.safeNote,
    p_idempotency_key_hash: sha256(
      `${parsed.data.contactSubmissionId}:${parsed.data.targetStatus}:${randomUUID()}`,
    ),
  });
  if (result.error)
    return commandFailure(
      {
        code:
          result.error.code === "40001" ? "VERSION_CONFLICT" : "INTERNAL_ERROR",
        messageKey: "admin.content.errors.failed",
        retryable: result.error.code === "40001",
      },
      correlationId,
    );
  revalidatePath(
    `/${parsed.data.locale}/admin/content/contacts/${parsed.data.contactSubmissionId}`,
  );
  revalidatePath(`/${parsed.data.locale}/admin/content`);
  return commandSuccess({ changed: true }, correlationId);
}
