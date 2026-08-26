import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

vi.mock("server-only", () => ({}));

function localEnvironment() {
  try {
    const output = execFileSync(
      resolve(process.cwd(), "node_modules/.bin/supabase"),
      ["status", "-o", "env"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return Object.fromEntries(
      output
        .split("\n")
        .filter((line) => line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [
            line.slice(0, separator),
            JSON.parse(line.slice(separator + 1)),
          ];
        }),
    ) as Record<string, string>;
  } catch {
    return undefined;
  }
}

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totp(secret: string, at = Date.now()) {
  const counter = BigInt(Math.floor(at / 30_000));
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(message)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(number).padStart(6, "0");
}

const local = localEnvironment();

describe.skipIf(!local)("local authorization boundary", () => {
  it("enforces roles, MFA, confirmations, sessions, audit privacy, and maintenance", async () => {
    const service = createClient<Database>(
      local!.API_URL,
      local!.SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
    const ownerEmail = "security-owner-" + marker + "@epoca.test";
    const managerEmail = "security-manager-" + marker + "@epoca.test";
    const ownerPassword = "Owner-" + marker + "-Secure-2026!";
    const managerPassword = "Manager-" + marker + "-Secure-2026!";
    const ownerUser = await service.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });
    const managerUser = await service.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      email_confirm: true,
    });
    expect(ownerUser.error).toBeNull();
    expect(managerUser.error).toBeNull();
    const ownerId = ownerUser.data.user!.id;
    const managerId = managerUser.data.user!.id;
    expect(
      (
        await service.from("profiles").insert([
          {
            id: ownerId,
            profile_kind: "staff",
            display_name: "Security Owner",
          },
          {
            id: managerId,
            profile_kind: "staff",
            display_name: "Security Manager",
          },
        ])
      ).error,
    ).toBeNull();
    expect(
      (
        await service.from("staff_members").insert([
          {
            profile_id: ownerId,
            role: "owner",
            active: true,
            mfa_required: true,
            activated_at: new Date().toISOString(),
          },
          {
            profile_id: managerId,
            role: "manager",
            active: true,
            mfa_required: false,
            activated_at: new Date().toISOString(),
          },
        ])
      ).error,
    ).toBeNull();

    const manager = createClient<Database>(local!.API_URL, local!.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (
        await manager.auth.signInWithPassword({
          email: managerEmail,
          password: managerPassword,
        })
      ).error,
    ).toBeNull();
    expect(
      (await manager.from("staff_members").select("profile_id")).data,
    ).toHaveLength(1);
    expect((await manager.from("audit_events").select("id")).data).toHaveLength(
      0,
    );
    expect(
      (
        await manager.rpc("manage_staff_member", {
          p_profile_id: managerId,
          p_role: "manager",
          p_active: false,
          p_reason: "Unauthorized Manager attempt",
          p_expected_version: 1,
        })
      ).error?.message,
    ).toContain("FORBIDDEN");

    const owner = createClient<Database>(local!.API_URL, local!.ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (
        await owner.auth.signInWithPassword({
          email: ownerEmail,
          password: ownerPassword,
        })
      ).error,
    ).toBeNull();
    expect((await owner.from("audit_events").select("id")).data).toHaveLength(
      0,
    );
    expect(
      (
        await owner.rpc("record_protected_operation", {
          p_operation_type: "staff-deactivate",
          p_entity_type: "staff",
          p_entity_id: managerId,
          p_confirmation: "STAFF DEACTIVATE " + managerId,
          p_reason: "AAL1 must not be enough",
        })
      ).error?.message,
    ).toContain("MFA_REQUIRED");

    const enrollment = await owner.auth.mfa.enroll({ factorType: "totp" });
    expect(enrollment.error).toBeNull();
    const verification = await owner.auth.mfa.challengeAndVerify({
      factorId: enrollment.data!.id,
      code: totp(enrollment.data!.totp.secret),
    });
    expect(verification.error).toBeNull();
    expect(
      (await owner.auth.mfa.getAuthenticatorAssuranceLevel()).data
        ?.currentLevel,
    ).toBe("aal2");

    const claims = await owner.auth.getClaims();
    const sessionId = claims.data?.claims?.session_id;
    const expiresAt = claims.data?.claims?.exp;
    expect(typeof sessionId).toBe("string");
    expect(typeof expiresAt).toBe("number");
    const session = await owner.rpc("record_current_session", {
      p_auth_session_id: String(sessionId),
      p_assurance_level: "aal2",
      p_user_agent_summary: "Vitest integration browser",
      p_ip_prefix_hash: "a".repeat(64),
      p_expires_at: new Date(Number(expiresAt) * 1000).toISOString(),
      p_device_label: "Integration device",
    });
    expect(session.error).toBeNull();

    const missingConfirmation = await owner.rpc("manage_staff_member", {
      p_profile_id: managerId,
      p_role: "manager",
      p_active: false,
      p_reason: "No exact confirmation yet",
      p_expected_version: 1,
    });
    expect(missingConfirmation.error?.message).toContain(
      "PROTECTED_CONFIRMATION_REQUIRED",
    );
    expect(
      (
        await owner.rpc("record_protected_operation", {
          p_operation_type: "staff-deactivate",
          p_entity_type: "staff",
          p_entity_id: managerId,
          p_confirmation: "STAFF DEACTIVATE " + managerId,
          p_reason: "Departed integration Manager",
        })
      ).error,
    ).toBeNull();
    const deactivated = await owner.rpc("manage_staff_member", {
      p_profile_id: managerId,
      p_role: "manager",
      p_active: false,
      p_reason: "Departed integration Manager",
      p_expected_version: 1,
    });
    expect(deactivated.error).toBeNull();
    expect(deactivated.data?.active).toBe(false);

    const forgedAudit = await service.from("audit_events").insert({
      actor_class: "service",
      action: "security.integration-forged",
      entity_type: "test",
      result: "failed",
      source: "integration",
      correlation_id: crypto.randomUUID(),
      summary: { password: "must be rejected" },
    });
    expect(forgedAudit.error?.message).toContain("SENSITIVE_AUDIT_SUMMARY");
    expect(
      (
        await owner.rpc("record_protected_operation", {
          p_operation_type: "export-sensitive",
          p_entity_type: "audit",
          p_entity_id: "audit",
          p_confirmation: "EXPORT SENSITIVE audit",
          p_reason: "Bounded integration evidence",
        })
      ).error,
    ).toBeNull();
    const auditExport = await owner.rpc("request_audit_export", {
      p_scope: { result: "succeeded", limit: 10000 },
      p_download_name: "audit-" + marker + ".csv",
    });
    expect(auditExport.error).toBeNull();
    expect(auditExport.data?.expires_at).toBeTruthy();

    expect(
      (
        await owner.rpc("revoke_current_session", {
          p_reason: "Integration session close",
        })
      ).data,
    ).toBe(true);
    expect(
      (
        await service
          .from("app_sessions")
          .select("revoked_at")
          .eq("auth_session_id", String(sessionId))
          .single()
      ).data?.revoked_at,
    ).toBeTruthy();
    const maintenance = await service.rpc("run_security_maintenance");
    expect(maintenance.error).toBeNull();
    expect(maintenance.data).toMatchObject({
      expiredInvitations: expect.any(Number),
      revokedSessions: expect.any(Number),
    });
  });
});
