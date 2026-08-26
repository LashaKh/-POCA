export type HealthStatus = "ok" | "disabled" | "degraded" | "down";

export type HealthCheck = {
  key: string;
  status: HealthStatus;
  critical: boolean;
  latencyMs?: number;
  ageSeconds?: number;
  warningAgeSeconds?: number;
  downAgeSeconds?: number;
  code?: string;
};

export type HealthSummary = {
  liveness: "ok";
  readiness: "ok" | "degraded" | "down";
  overall: "ok" | "degraded" | "down";
  checks: HealthCheck[];
};

function applyAgeBudget(check: HealthCheck): HealthCheck {
  if (check.status !== "ok" || check.ageSeconds === undefined) return check;
  if (
    check.downAgeSeconds !== undefined &&
    check.ageSeconds > check.downAgeSeconds
  ) {
    return { ...check, status: "down", code: "AGE_BUDGET_EXCEEDED" };
  }
  if (
    check.warningAgeSeconds !== undefined &&
    check.ageSeconds > check.warningAgeSeconds
  ) {
    return { ...check, status: "degraded", code: "AGE_BUDGET_WARNING" };
  }
  return check;
}

export function aggregateHealth(input: readonly HealthCheck[]): HealthSummary {
  const checks = input.map(applyAgeBudget);
  const criticalDown = checks.some(
    (check) => check.critical && check.status === "down",
  );
  const degraded = checks.some(
    (check) => check.status === "degraded" || check.status === "down",
  );
  const readiness = criticalDown ? "down" : degraded ? "degraded" : "ok";
  return { liveness: "ok", readiness, overall: readiness, checks };
}
