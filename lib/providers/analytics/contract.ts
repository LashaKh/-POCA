import type { NamedEventValidation } from "@/lib/observability/events";

export type AnalyticsConsent = "granted" | "refused" | "withdrawn";

export type AnalyticsEventInput = {
  consent: AnalyticsConsent;
  name: string;
  properties: Record<string, unknown>;
};

export type AnalyticsEnvelope = {
  event: string;
  properties: Record<string, unknown>;
};

export type AnalyticsResult =
  | { accepted: true }
  | {
      accepted: false;
      reason:
        | "DISABLED"
        | "CONSENT_REQUIRED"
        | Exclude<NamedEventValidation, { ok: true }>["code"];
    };

export type AnalyticsAdapter = {
  capabilities: {
    autocapture: false;
    sessionReplay: false;
    personProfiles: false;
  };
  track(input: AnalyticsEventInput): Promise<AnalyticsResult>;
  captured(): readonly AnalyticsEnvelope[];
};

export const privacyCapabilities = {
  autocapture: false,
  sessionReplay: false,
  personProfiles: false,
} as const;
