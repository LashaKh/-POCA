import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

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

const local = localEnvironment();

describe.skipIf(!local)("local production operations", () => {
  it("leases, heartbeats, completes, and catches up scheduled work exactly once", async () => {
    const client = createClient(local!.API_URL, local!.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const suffix = crypto.randomUUID();
    const action = await client
      .from("scheduled_actions")
      .insert({
        action_type: "integration.reconcile",
        subject_type: "operations-test",
        due_at: "1970-01-01T00:00:00.000Z",
        idempotency_key: `operations-action-${suffix}`,
        correlation_id: crypto.randomUUID(),
      })
      .select("id")
      .single();
    expect(action.error).toBeNull();

    const claimed = await client.rpc("claim_due_scheduled_actions", {
      p_worker_id: `integration-${suffix}`,
      p_limit: 10,
      p_lease_seconds: 120,
    });
    expect(claimed.error).toBeNull();
    const leased = claimed.data.find(
      (row: { action_id: string }) => row.action_id === action.data!.id,
    );
    expect(leased).toBeDefined();

    const secondClaim = await client.rpc("claim_due_scheduled_actions", {
      p_worker_id: `competitor-${suffix}`,
      p_limit: 10,
      p_lease_seconds: 120,
    });
    expect(secondClaim.error).toBeNull();
    expect(
      secondClaim.data.some(
        (row: { action_id: string }) => row.action_id === action.data!.id,
      ),
    ).toBe(false);

    const heartbeat = await client.rpc("heartbeat_scheduled_action", {
      p_action_id: action.data!.id,
      p_run_id: leased.run_id,
      p_worker_id: `integration-${suffix}`,
      p_extend_seconds: 180,
    });
    expect(heartbeat.error).toBeNull();
    expect(heartbeat.data).toBe(true);

    const completed = await client.rpc("complete_scheduled_action", {
      p_action_id: action.data!.id,
      p_run_id: leased.run_id,
      p_worker_id: `integration-${suffix}`,
      p_success: true,
      p_safe_error_code: null,
      p_result_summary: { affected: 1 },
    });
    expect(completed.error).toBeNull();
    expect(completed.data.status).toBe("complete");
    expect(
      (
        await client
          .from("scheduled_action_runs")
          .select("status")
          .eq("id", leased.run_id)
          .single()
      ).data?.status,
    ).toBe("succeeded");

    const catchUpKey = `catch-up-${suffix}`;
    const firstCatchUp = await client.rpc("enqueue_scheduled_catch_up", {
      p_action_type: "integration.cleanup",
      p_subject_type: "operations-test",
      p_scheduled_for: new Date(Date.now() - 300_000).toISOString(),
      p_idempotency_key: catchUpKey,
      p_correlation_id: crypto.randomUUID(),
    });
    const replayCatchUp = await client.rpc("enqueue_scheduled_catch_up", {
      p_action_type: "integration.cleanup",
      p_subject_type: "operations-test",
      p_scheduled_for: new Date(Date.now() - 300_000).toISOString(),
      p_idempotency_key: catchUpKey,
      p_correlation_id: crypto.randomUUID(),
    });
    expect(firstCatchUp.error).toBeNull();
    expect(replayCatchUp.error).toBeNull();
    expect(replayCatchUp.data.id).toBe(firstCatchUp.data.id);
  });

  it("deduplicates alerts and records health, readiness, integrity, and rollback evidence", async () => {
    const client = createClient(local!.API_URL, local!.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const suffix = crypto.randomUUID();
    const fingerprint = `integration-alert-${suffix}`;
    const first = await client.rpc("record_operational_alert", {
      p_fingerprint: fingerprint,
      p_category: "scheduler",
      p_severity: "high",
      p_safe_summary: "Synthetic scheduler age breach",
      p_correlation_id: crypto.randomUUID(),
      p_safe_context: { ageBucket: "15-30m" },
    });
    const replay = await client.rpc("record_operational_alert", {
      p_fingerprint: fingerprint,
      p_category: "scheduler",
      p_severity: "high",
      p_safe_summary: "Synthetic scheduler age breach",
      p_correlation_id: crypto.randomUUID(),
      p_safe_context: { ageBucket: "15-30m" },
    });
    expect(first.error).toBeNull();
    expect(replay.error).toBeNull();
    expect(replay.data.id).toBe(first.data.id);
    expect(replay.data.occurrence_count).toBe(2);
    expect(
      (
        await client
          .from("operational_alert_occurrences")
          .select("id", { count: "exact", head: true })
          .eq("alert_id", first.data.id)
      ).count,
    ).toBe(2);

    const health = await client.rpc("record_health_snapshot", {
      p_environment: "local",
      p_release: "integration",
      p_overall: "degraded",
      p_checks: {
        database: { status: "ok" },
        scheduler: { status: "degraded", code: "AGE_BUDGET_WARNING" },
      },
      p_correlation_id: crypto.randomUUID(),
    });
    expect(health.error).toBeNull();
    expect(health.data.overall).toBe("degraded");

    const release = await client
      .from("release_records")
      .insert({
        release_id: `integration-${suffix}`,
        commit_sha: "a".repeat(40),
        environment: "local",
        stage: "build-complete",
        status: "promoted",
        schema_version: "202608250071",
        correlation_id: crypto.randomUUID(),
      })
      .select("id")
      .single();
    expect(release.error).toBeNull();
    const rollback = await client
      .from("release_records")
      .insert({
        release_id: `rollback-${suffix}`,
        commit_sha: "b".repeat(40),
        environment: "local",
        stage: "build-complete",
        status: "rolled-back",
        schema_version: "202608250071",
        previous_release_id: release.data!.id,
        rollback_reason_code: "SMOKE_GATE_FAILED",
        correlation_id: crypto.randomUUID(),
      })
      .select("previous_release_id,rollback_reason_code")
      .single();
    expect(rollback.error).toBeNull();
    expect(rollback.data?.previous_release_id).toBe(release.data!.id);

    const readiness = await client.rpc("record_readiness_assessment", {
      p_environment: "local",
      p_stage: "build-complete",
      p_decision: "hold",
      p_gates: { build: true, backupRestore: false },
      p_blockers: ["BACKUP_RESTORE_UNPROVEN"],
      p_release_record_id: release.data!.id,
      p_correlation_id: crypto.randomUUID(),
    });
    expect(readiness.error).toBeNull();
    expect(readiness.data.blockers).toContain("BACKUP_RESTORE_UNPROVEN");

    const integrity = await client.rpc("verify_critical_data_integrity");
    expect(integrity.error).toBeNull();
    expect(integrity.data.ok).toBe(true);
    expect(integrity.data.checks).toHaveProperty("active_owner_count");
    expect(integrity.data.checks).toHaveProperty("media_link_orphans");
  });
});
