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

export type AuditExportState = CommandResult<{ id: string }> | undefined;

const schema = z.object({
  locale: z.string().refine(isAppLocale),
  query: z.string().trim().max(100).default(""),
  action: z.string().trim().max(120).default(""),
  result: z.enum(["", "allowed", "denied", "succeeded", "failed"]).default(""),
  confirmation: z.string().max(240),
  reason: z.string().trim().min(2).max(500),
});

export async function requestAuditExportAction(
  _previous: AuditExportState,
  formData: FormData,
): Promise<AuditExportState> {
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
    const protectedResult = await client.rpc("record_protected_operation", {
      p_operation_type: "export-sensitive",
      p_entity_type: "audit",
      p_entity_id: "audit",
      p_confirmation: parsed.data.confirmation,
      p_reason: parsed.data.reason,
    });
    if (protectedResult.error) return failure();
    const result = await client.rpc("request_audit_export", {
      p_scope: {
        query: parsed.data.query,
        action: parsed.data.action,
        result: parsed.data.result,
        limit: 10000,
      },
      p_download_name: `epoca-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    if (result.error) return failure();
    revalidatePath(`/${parsed.data.locale}/admin/audit`);
    return commandSuccess({ id: result.data.id }, correlationId);
  } catch {
    return failure();
  }
}
