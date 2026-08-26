import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { collectOperationalHealth } from "./health";
import {
  evaluateOperationalReadiness,
  type QualityGateEvidence,
} from "./readiness";

function qualityFromEvidence(value: Json): QualityGateEvidence {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { build: false, migrations: false, tests: false, security: false };
  }
  const gates = value.gates;
  if (!gates || typeof gates !== "object" || Array.isArray(gates)) {
    return { build: false, migrations: false, tests: false, security: false };
  }
  const passed = (key: string) =>
    gates[key] === true || gates[key] === "passed";
  return {
    build: passed("build"),
    migrations: passed("migrations"),
    tests: passed("tests"),
    security: passed("security"),
  };
}

export async function getOperationsOverview() {
  const client = createServiceSupabaseClient();
  const [health, alerts, runs, notifications, release, recordedReadiness] =
    await Promise.all([
      collectOperationalHealth(),
      client
        .from("operational_alerts")
        .select(
          "id,category,severity,status,safe_summary,occurrence_count,last_seen_at,correlation_id",
        )
        .in("status", ["open", "acknowledged"])
        .order("last_seen_at", { ascending: false })
        .limit(12),
      client
        .from("scheduled_action_runs")
        .select(
          "id,status,scheduled_for,completed_at,safe_error_code,scheduled_action:scheduled_actions!scheduled_action_runs_scheduled_action_id_fkey(action_type)",
        )
        .order("leased_at", { ascending: false })
        .limit(12),
      client
        .from("notifications")
        .select("status")
        .order("created_at", { ascending: false })
        .limit(1000),
      client
        .from("release_records")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("readiness_assessments")
        .select("*")
        .order("evaluated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  for (const result of [
    alerts,
    runs,
    notifications,
    release,
    recordedReadiness,
  ]) {
    if (result.error) throw result.error;
  }

  const quality = release.data
    ? qualityFromEvidence(release.data.evidence)
    : { build: false, migrations: false, tests: false, security: false };
  const readiness = await evaluateOperationalReadiness(quality);
  const notificationCounts = (notifications.data ?? []).reduce<
    Record<string, number>
  >((counts, notification) => {
    counts[notification.status] = (counts[notification.status] ?? 0) + 1;
    return counts;
  }, {});

  return {
    health,
    alerts: alerts.data ?? [],
    runs: (runs.data ?? []).map((run) => ({
      ...run,
      actionType: run.scheduled_action?.action_type ?? "unknown",
    })),
    notificationCounts,
    release: release.data,
    readiness,
    recordedReadiness: recordedReadiness.data,
  };
}
