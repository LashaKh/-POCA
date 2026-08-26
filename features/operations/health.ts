import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

import {
  aggregateHealth,
  type HealthCheck,
  type HealthSummary,
} from "./health-domain";

type TimedRow = { created_at?: string; queued_at?: string; due_at?: string };

function ageSeconds(row: TimedRow | null | undefined) {
  const timestamp = row?.created_at ?? row?.queued_at ?? row?.due_at;
  return timestamp
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
      )
    : 0;
}

export function currentRelease() {
  return (
    process.env.COMMIT_REF ??
    process.env.DEPLOY_ID ??
    process.env.npm_package_version ??
    "development"
  ).slice(0, 120);
}

export function currentEnvironment() {
  const value = process.env.DEPLOY_ENV;
  return ["local", "preview", "staging", "production"].includes(value ?? "")
    ? value!
    : "local";
}

export type OperationalHealth = HealthSummary & {
  release: string;
  environment: string;
  checkedAt: string;
  queues: Record<string, { depth: number; oldestAgeSeconds: number }>;
};

export async function collectOperationalHealth(): Promise<OperationalHealth> {
  const client = createServiceSupabaseClient();
  const started = performance.now();
  const [
    database,
    notifications,
    oldestNotification,
    media,
    oldestMedia,
    scheduled,
    oldestScheduled,
    latestSchedulerRun,
    integrations,
  ] = await Promise.all([
    client.from("business_settings").select("key").limit(1),
    client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "failed"]),
    client
      .from("notifications")
      .select("created_at")
      .in("status", ["pending", "failed"])
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    client
      .from("media_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "retrying"]),
    client
      .from("media_jobs")
      .select("queued_at")
      .in("status", ["queued", "retrying"])
      .order("queued_at")
      .limit(1)
      .maybeSingle(),
    client
      .from("scheduled_actions")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "failed"])
      .lte("due_at", new Date().toISOString()),
    client
      .from("scheduled_actions")
      .select("due_at")
      .in("status", ["pending", "failed"])
      .lte("due_at", new Date().toISOString())
      .order("due_at")
      .limit(1)
      .maybeSingle(),
    client
      .from("scheduled_action_runs")
      .select("completed_at")
      .eq("status", "succeeded")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("integration_status_safe").select("key,mode,safe_reason"),
  ]);

  const notificationAge = ageSeconds(oldestNotification.data);
  const mediaAge = ageSeconds(oldestMedia.data);
  const scheduledAge = ageSeconds(oldestScheduled.data);
  const lastSchedulerAge = latestSchedulerRun.data?.completed_at
    ? Math.max(
        0,
        Math.floor(
          (Date.now() -
            new Date(latestSchedulerRun.data.completed_at).getTime()) /
            1000,
        ),
      )
    : scheduled.count
      ? scheduledAge
      : 0;

  const checks: HealthCheck[] = [
    {
      key: "database",
      critical: true,
      status: database.error ? "down" : "ok",
      latencyMs: Math.round(performance.now() - started),
      code: database.error ? "DATABASE_UNAVAILABLE" : undefined,
    },
    {
      key: "notification-queue",
      critical: false,
      status: notifications.error || oldestNotification.error ? "down" : "ok",
      ageSeconds: notificationAge,
      warningAgeSeconds: 300,
      downAgeSeconds: 1800,
    },
    {
      key: "media-queue",
      critical: false,
      status: media.error || oldestMedia.error ? "down" : "ok",
      ageSeconds: mediaAge,
      warningAgeSeconds: 900,
      downAgeSeconds: 3600,
    },
    {
      key: "scheduler",
      critical: true,
      status:
        scheduled.error || oldestScheduled.error || latestSchedulerRun.error
          ? "down"
          : "ok",
      ageSeconds: lastSchedulerAge,
      warningAgeSeconds: 600,
      downAgeSeconds: 1800,
      code:
        !latestSchedulerRun.data && !scheduled.count
          ? "NO_DUE_WORK"
          : undefined,
    },
    ...(integrations.data ?? []).map(
      (integration): HealthCheck => ({
        key: `integration-${integration.key}`,
        critical: false,
        status:
          integration.mode === "degraded"
            ? "degraded"
            : integration.mode === "disabled"
              ? "disabled"
              : "ok",
        code: integration.safe_reason ?? undefined,
      }),
    ),
  ];
  if (integrations.error) {
    checks.push({
      key: "integration-status",
      critical: false,
      status: "down",
      code: "INTEGRATION_STATUS_UNAVAILABLE",
    });
  }

  return {
    ...aggregateHealth(checks),
    release: currentRelease(),
    environment: currentEnvironment(),
    checkedAt: new Date().toISOString(),
    queues: {
      notifications: {
        depth: notifications.count ?? 0,
        oldestAgeSeconds: notificationAge,
      },
      media: { depth: media.count ?? 0, oldestAgeSeconds: mediaAge },
      scheduled: {
        depth: scheduled.count ?? 0,
        oldestAgeSeconds: scheduledAge,
      },
    },
  };
}

export function publicHealthResponse(health: OperationalHealth) {
  return {
    status: health.overall,
    release: health.release,
    environment: health.environment,
    timestamp: health.checkedAt,
  };
}
