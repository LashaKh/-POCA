import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { processAuditExports } from "@/features/audit/exporter";
import { runContentScheduleMaintenance } from "@/features/content/scheduler";
import { inspectContactCleanup } from "@/features/contact/cleanup";
import { inspectConsentRetention } from "@/features/consent/retention";
import {
  publishDueCatalogWork,
  expireDueCommerceWork,
} from "@/features/operations/scheduler";
import { processCatalogExports } from "@/features/catalog/exporter";
import { processIngestionWork } from "@/features/media/worker";
import { processNotificationOutbox } from "@/features/operations/notification-worker";
import { runSecurityMaintenance } from "@/features/operations/security-maintenance";
import { processPaymentProviderEvents } from "@/features/payments/webhook-service";
import { cleanupReturnEvidence } from "@/features/returns/evidence";
import { runWorldwideSellingMaintenance } from "@/features/delivery/maintenance";
import { createCorrelationId } from "@/lib/observability/logger";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { collectOperationalHealth } from "./health";
import { planScheduledCatchUp } from "./scheduler-domain";

export const coordinatorJobs = [
  { key: "publication", intervalSeconds: 300, maxCatchUp: 2 },
  { key: "expiry", intervalSeconds: 300, maxCatchUp: 3 },
  { key: "recovery", intervalSeconds: 300, maxCatchUp: 2 },
  { key: "cleanup", intervalSeconds: 3600, maxCatchUp: 1 },
  { key: "reconciliation", intervalSeconds: 300, maxCatchUp: 3 },
  { key: "outbox", intervalSeconds: 300, maxCatchUp: 3 },
  { key: "alert", intervalSeconds: 300, maxCatchUp: 2 },
  { key: "export", intervalSeconds: 300, maxCatchUp: 2 },
  { key: "security", intervalSeconds: 3600, maxCatchUp: 1 },
] as const;

export type CoordinatorJobKey = (typeof coordinatorJobs)[number]["key"];

type ClaimedAction = {
  action_id: string;
  run_id: string;
  action_type: string;
  correlation_id: string;
};

function safeErrorCode(error: unknown) {
  const name = error instanceof Error ? error.name : "COORDINATOR_JOB_FAILED";
  const normalized = name
    .replaceAll(/[^A-Za-z0-9]+/g, "_")
    .replaceAll(/(^_+|_+$)/g, "")
    .toUpperCase();
  return /^[A-Z0-9_]{2,80}$/.test(normalized)
    ? normalized
    : "COORDINATOR_JOB_FAILED";
}

async function recordHealthAndAlerts() {
  const client = createServiceSupabaseClient();
  const health = await collectOperationalHealth();
  const correlationId = createCorrelationId();
  const snapshot = await client.rpc("record_health_snapshot", {
    p_environment: health.environment,
    p_release: health.release,
    p_overall: health.overall,
    p_checks: Object.fromEntries(
      health.checks.map((check) => [
        check.key,
        {
          status: check.status,
          code: check.code,
          ageSeconds: check.ageSeconds,
          latencyMs: check.latencyMs,
        },
      ]),
    ),
    p_correlation_id: correlationId,
  });
  if (snapshot.error) throw snapshot.error;

  let alerts = 0;
  for (const check of health.checks) {
    if (check.status !== "degraded" && check.status !== "down") continue;
    const alert = await client.rpc("record_operational_alert", {
      p_fingerprint: `health:${check.key}:${check.status}`,
      p_category: "health",
      p_severity:
        check.status === "down" && check.critical ? "critical" : "high",
      p_safe_summary: `${check.key} is ${check.status}`,
      p_correlation_id: correlationId,
      p_safe_context: {
        check: check.key,
        status: check.status,
        code: check.code ?? "THRESHOLD_BREACH",
      },
    });
    if (alert.error) throw alert.error;
    alerts += 1;
  }
  return { status: health.overall, alerts };
}

async function verifySecurityIntegrity() {
  const client = createServiceSupabaseClient();
  const integrity = await client.rpc("verify_critical_data_integrity");
  if (integrity.error) throw integrity.error;
  const result = z
    .object({ ok: z.boolean(), checks: z.record(z.string(), z.unknown()) })
    .parse(integrity.data);
  if (!result.ok) {
    const alert = await client.rpc("record_operational_alert", {
      p_fingerprint: "security:critical-integrity",
      p_category: "security",
      p_severity: "critical",
      p_safe_summary: "Critical data integrity verification failed",
      p_correlation_id: createCorrelationId(),
      p_safe_context: { status: "failed" },
    });
    if (alert.error) throw alert.error;
  }
  return { ok: result.ok };
}

async function executeJob(key: CoordinatorJobKey) {
  switch (key) {
    case "publication":
      return Promise.all([
        publishDueCatalogWork(25),
        runContentScheduleMaintenance(100),
      ]);
    case "expiry":
      return Promise.all([
        expireDueCommerceWork(50),
        runWorldwideSellingMaintenance(100),
      ]);
    case "recovery":
      return processIngestionWork({
        timeBudgetMs: 8_000,
        maxInspections: 2,
        maxJobs: 1,
      });
    case "cleanup":
      return Promise.all([
        runSecurityMaintenance(),
        cleanupReturnEvidence(),
        inspectContactCleanup(),
        inspectConsentRetention(),
      ]);
    case "reconciliation":
      return processPaymentProviderEvents({ limit: 20 });
    case "outbox":
      return processNotificationOutbox({ limit: 25 });
    case "alert":
      return recordHealthAndAlerts();
    case "export": {
      const [catalog, audit] = await Promise.all([
        processCatalogExports(2),
        processAuditExports(2),
      ]);
      return { catalog, audit };
    }
    case "security":
      return verifySecurityIntegrity();
  }
}

function jobKey(actionType: string): CoordinatorJobKey | undefined {
  const key = actionType.replace(/^coordinator\./, "");
  return coordinatorJobs.some((job) => job.key === key)
    ? (key as CoordinatorJobKey)
    : undefined;
}

async function enqueueCatchUp(now: Date) {
  const client = createServiceSupabaseClient();
  const windows = await Promise.all(
    coordinatorJobs.map(async (job) => {
      const latest = await client
        .from("scheduled_actions")
        .select("due_at")
        .eq("action_type", `coordinator.${job.key}`)
        .eq("status", "complete")
        .order("due_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest.error) throw latest.error;
      return {
        ...job,
        lastSuccessfulAt: latest.data
          ? new Date(latest.data.due_at)
          : new Date(now.getTime() - job.intervalSeconds * 1000),
      };
    }),
  );
  const planned = planScheduledCatchUp({ now, jobs: windows });
  for (const item of planned) {
    const enqueued = await client.rpc("enqueue_scheduled_catch_up", {
      p_action_type: `coordinator.${item.key}`,
      p_subject_type: "operations-coordinator",
      p_scheduled_for: item.scheduledFor,
      p_idempotency_key: `coordinator:${item.key}:${item.scheduledFor}`,
      p_correlation_id: createCorrelationId(),
    });
    if (enqueued.error) throw enqueued.error;
  }
  return planned.length;
}

export async function runScheduledCoordinator({
  maxActions = 8,
  timeBudgetMs = 22_000,
}: {
  maxActions?: number;
  timeBudgetMs?: number;
} = {}) {
  const started = Date.now();
  const deadline = started + Math.min(Math.max(timeBudgetMs, 1_000), 25_000);
  const client = createServiceSupabaseClient();
  const workerId = `coordinator-${randomUUID()}`;
  const enqueued = await enqueueCatchUp(new Date());
  const due = await client
    .from("scheduled_actions")
    .select("id")
    .like("action_type", "coordinator.%")
    .in("status", ["pending", "failed"])
    .lte("due_at", new Date().toISOString())
    .order("due_at")
    .limit(Math.min(Math.max(maxActions, 1), 20));
  if (due.error) throw due.error;

  let completed = 0;
  let failed = 0;
  for (const selected of due.data) {
    if (Date.now() >= deadline) break;
    const claim = await client.rpc("claim_scheduled_action", {
      p_action_id: selected.id,
      p_worker_id: workerId,
      p_lease_seconds: 120,
    });
    if (claim.error) throw claim.error;
    const leased = claim.data[0] as ClaimedAction | undefined;
    if (!leased) continue;
    const key = jobKey(leased.action_type);
    if (!key) {
      await client.rpc("complete_scheduled_action", {
        p_action_id: leased.action_id,
        p_run_id: leased.run_id,
        p_worker_id: workerId,
        p_success: false,
        p_safe_error_code: "UNKNOWN_COORDINATOR_JOB",
        p_result_summary: { status: "rejected" },
      });
      failed += 1;
      continue;
    }

    try {
      const result = await executeJob(key);
      const completion = await client.rpc("complete_scheduled_action", {
        p_action_id: leased.action_id,
        p_run_id: leased.run_id,
        p_worker_id: workerId,
        p_success: true,
        p_safe_error_code: undefined,
        p_result_summary: { job: key, status: "succeeded", result },
      });
      if (completion.error) throw completion.error;
      completed += 1;
    } catch (error) {
      const completion = await client.rpc("complete_scheduled_action", {
        p_action_id: leased.action_id,
        p_run_id: leased.run_id,
        p_worker_id: workerId,
        p_success: false,
        p_safe_error_code: safeErrorCode(error),
        p_result_summary: { job: key, status: "failed" },
      });
      if (completion.error) throw completion.error;
      failed += 1;
    }
  }
  return { enqueued, completed, failed, durationMs: Date.now() - started };
}
