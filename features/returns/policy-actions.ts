"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { managerCommandClient } from "@/features/auth/admin-command";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

import { returnPolicySchema } from "./schema";

export async function configureReturnPolicyAction(
  _previous: CommandResult<{ changed: true }> | undefined,
  formData: FormData,
): Promise<CommandResult<{ changed: true }>> {
  const correlationId = randomUUID();
  const input = Object.fromEntries(formData);
  const parsed = returnPolicySchema.safeParse({
    ...input,
    allowedReasons: formData.getAll("allowedReasons"),
  });
  if (!parsed.success) {
    return commandFailure(
      {
        code: "INVALID_INPUT",
        messageKey: "returns.errors.invalid",
        retryable: false,
      },
      correlationId,
    );
  }
  const client = await managerCommandClient("returns.policy-configure");
  const result = await client.rpc("configure_return_policy", {
    p_version: parsed.data.version,
    p_cancellation_window_hours: parsed.data.cancellationWindowHours,
    p_return_window_days: parsed.data.returnWindowDays,
    p_allowed_reasons: parsed.data.allowedReasons,
    p_max_evidence_files: parsed.data.maxEvidenceFiles,
    p_max_evidence_bytes: parsed.data.maxEvidenceBytes,
    p_restock_mode: parsed.data.restockMode,
  });
  if (result.error) {
    return commandFailure(
      {
        code: "VERSION_CONFLICT",
        messageKey: "returns.errors.failed",
        retryable: true,
      },
      correlationId,
    );
  }
  revalidatePath(`/${parsed.data.locale}/admin/settings/returns`);
  return commandSuccess({ changed: true }, correlationId);
}
