"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAssurance, requireOwner } from "@/features/auth/authorization";
import { resolveActorContext } from "@/features/auth/context";
import { getCurrentAuthSessionId } from "@/features/auth/session";
import { isAppLocale } from "@/i18n/routing";
import { getServerEnvironment } from "@/lib/env/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import {
  commandFailure,
  commandSuccess,
  type CommandResult,
} from "@/lib/validation/command-result";

export type StaffActionState = CommandResult<{ completed: true }> | undefined;

async function ownerClient() {
  const client = await createServerSupabaseClient();
  const context = requireOwner(
    await resolveActorContext(client, await getCurrentAuthSessionId(client)),
  );
  requireAssurance(context, "aal2");
  return { client, context };
}

function failed(correlationId: string, code = "INVALID_INPUT") {
  return commandFailure(
    {
      code: code === "VERSION_CONFLICT" ? "VERSION_CONFLICT" : "INVALID_INPUT",
      messageKey: "admin.security.actionFailed",
      retryable: code === "VERSION_CONFLICT",
    },
    correlationId,
  );
}

const invitationSchema = z.object({
  locale: z.string().refine(isAppLocale),
  email: z.email().max(254),
  displayName: z.string().trim().min(1).max(160),
  role: z.enum(["owner", "manager"]),
});

export async function inviteStaffAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const correlationId = randomUUID();
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(correlationId);
  try {
    const { context } = await ownerClient();
    const service = createServiceSupabaseClient();
    const environment = getServerEnvironment();
    const redirectTo = `${environment.SITE_URL ?? "http://127.0.0.1:3000"}/${parsed.data.locale}/auth/recovery?mode=update`;
    const invitation = await service.auth.admin.inviteUserByEmail(
      parsed.data.email.toLowerCase(),
      {
        redirectTo,
        data: {
          display_name: parsed.data.displayName,
          profile_kind: "staff",
          locale: parsed.data.locale,
        },
      },
    );
    if (invitation.error || !invitation.data.user) return failed(correlationId);
    const profile = await service.from("profiles").upsert({
      id: invitation.data.user.id,
      profile_kind: "staff",
      display_name: parsed.data.displayName,
      locale: parsed.data.locale,
    });
    if (profile.error) return failed(correlationId);
    const staff = await service.from("staff_members").upsert({
      profile_id: invitation.data.user.id,
      role: parsed.data.role,
      active: true,
      mfa_required: parsed.data.role === "owner",
      invited_by: context.profileId,
      activated_at: new Date().toISOString(),
    });
    if (staff.error) return failed(correlationId);
    const record = await service.from("staff_invitations").insert({
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      auth_user_id: invitation.data.user.id,
      invited_by: context.profileId,
    });
    if (record.error) return failed(correlationId);
    const audit = await service.from("audit_events").insert({
      actor_profile_id: context.profileId,
      actor_class: "owner",
      action: "security.staff.invite",
      entity_type: "staff",
      entity_id: invitation.data.user.id,
      result: "succeeded",
      source: "staff-security",
      correlation_id: correlationId,
      retention_class: "security",
      summary: { role: parsed.data.role },
    });
    if (audit.error) return failed(correlationId);
    revalidatePath(`/${parsed.data.locale}/admin/settings/staff`);
    return commandSuccess({ completed: true }, correlationId);
  } catch {
    return failed(correlationId);
  }
}

const staffChangeSchema = z.object({
  locale: z.string().refine(isAppLocale),
  profileId: z.uuid(),
  role: z.enum(["owner", "manager"]),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
  expectedVersion: z.coerce.number().int().positive(),
  confirmation: z.string().max(240).optional().default(""),
  reason: z.string().trim().min(2).max(500),
});

export async function manageStaffAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const correlationId = randomUUID();
  const parsed = staffChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(correlationId);
  try {
    const { client } = await ownerClient();
    const current = await client
      .from("staff_members")
      .select("role,active,version")
      .eq("profile_id", parsed.data.profileId)
      .single();
    if (current.error) return failed(correlationId);
    const operation =
      !parsed.data.active && current.data.active
        ? "staff-deactivate"
        : parsed.data.role !== current.data.role
          ? "staff-role-change"
          : undefined;
    if (operation) {
      const protectedResult = await client.rpc("record_protected_operation", {
        p_operation_type: operation,
        p_entity_type: "staff",
        p_entity_id: parsed.data.profileId,
        p_confirmation: parsed.data.confirmation,
        p_reason: parsed.data.reason,
      });
      if (protectedResult.error) return failed(correlationId);
    }
    const result = await client.rpc("manage_staff_member", {
      p_profile_id: parsed.data.profileId,
      p_role: parsed.data.role,
      p_active: parsed.data.active,
      p_reason: parsed.data.reason,
      p_expected_version: parsed.data.expectedVersion,
    });
    if (result.error) {
      return failed(
        correlationId,
        result.error.code === "40001" ? "VERSION_CONFLICT" : result.error.code,
      );
    }
    revalidatePath(`/${parsed.data.locale}/admin/settings/staff`);
    return commandSuccess({ completed: true }, correlationId);
  } catch {
    return failed(correlationId);
  }
}

const revokeSchema = z.object({
  locale: z.string().refine(isAppLocale),
  profileId: z.uuid(),
  confirmation: z.string().max(240),
  reason: z.string().trim().min(2).max(500),
});

export async function revokeStaffSessionsAction(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const correlationId = randomUUID();
  const parsed = revokeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed(correlationId);
  try {
    const { client } = await ownerClient();
    const protectedResult = await client.rpc("record_protected_operation", {
      p_operation_type: "session-revoke-all",
      p_entity_type: "profile",
      p_entity_id: parsed.data.profileId,
      p_confirmation: parsed.data.confirmation,
      p_reason: parsed.data.reason,
    });
    if (protectedResult.error) return failed(correlationId);
    const result = await client.rpc("revoke_app_sessions", {
      p_profile_id: parsed.data.profileId,
      p_keep_auth_session_id: undefined,
      p_reason: parsed.data.reason,
    });
    if (result.error) return failed(correlationId);
    revalidatePath(`/${parsed.data.locale}/admin/settings/staff`);
    return commandSuccess({ completed: true }, correlationId);
  } catch {
    return failed(correlationId);
  }
}
