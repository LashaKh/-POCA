import type { ServerEnvironment } from "@/lib/env/server";

export type ProviderName =
  | "payment"
  | "email"
  | "assistance"
  | "analytics"
  | "monitoring";
export type ProviderMode = "disabled" | "fixture" | "sandbox" | "live";
export type IntegrationState = "disabled" | "test" | "degraded" | "ready";

export type ProviderStatus = {
  provider: ProviderName;
  mode: ProviderMode;
  state: IntegrationState;
  capabilities: string[];
  safeReason?: string;
};

export function statusFromMode(
  provider: ProviderName,
  mode: ProviderMode,
  capabilities: string[],
): ProviderStatus {
  if (mode === "disabled") {
    return {
      provider,
      mode,
      state: "disabled",
      capabilities: [],
      safeReason: "not configured",
    };
  }
  if (mode === "fixture" || mode === "sandbox") {
    return { provider, mode, state: "test", capabilities };
  }
  return { provider, mode, state: "ready", capabilities };
}

export function getProviderStatuses(env: ServerEnvironment) {
  return [
    statusFromMode("payment", env.PAYMENT_PROVIDER_MODE, [
      "initiate",
      "reconcile",
      "refund",
    ]),
    statusFromMode("email", env.EMAIL_PROVIDER_MODE, [
      "transactional",
      "webhooks",
    ]),
    statusFromMode("assistance", env.ASSISTANCE_PROVIDER_MODE, [
      "draft-product",
    ]),
    statusFromMode("analytics", env.ANALYTICS_PROVIDER_MODE, [
      "consented-events",
    ]),
    statusFromMode("monitoring", env.MONITORING_PROVIDER_MODE, [
      "safe-errors",
      "traces",
    ]),
  ];
}
