import { validateNamedEvent } from "@/lib/observability/events";

import {
  type AnalyticsAdapter,
  type AnalyticsEnvelope,
  type AnalyticsEventInput,
  type AnalyticsResult,
  privacyCapabilities,
} from "./contract";

export type AnalyticsAdapterConfig =
  | { mode: "disabled" }
  | { mode: "fixture"; release?: string }
  | {
      mode: "posthog";
      publicKey: string;
      host: string;
      release: string;
      transport?: (payload: AnalyticsEnvelope) => Promise<void>;
    };

function validate(input: AnalyticsEventInput): AnalyticsResult | undefined {
  if (input.consent !== "granted") {
    return { accepted: false, reason: "CONSENT_REQUIRED" };
  }
  const result = validateNamedEvent(input);
  if (!result.ok) return { accepted: false, reason: result.code };
  return undefined;
}

function postHogTransport(config: {
  publicKey: string;
  host: string;
  release: string;
}) {
  const endpoint = new URL("/capture/", config.host);
  return async (payload: AnalyticsEnvelope) => {
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        api_key: config.publicKey,
        event: payload.event,
        properties: {
          ...payload.properties,
          $lib: "epoca",
          $process_person_profile: false,
          release: config.release,
        },
      }),
    });
  };
}

export function createAnalyticsAdapter(
  config: AnalyticsAdapterConfig,
): AnalyticsAdapter {
  const events: AnalyticsEnvelope[] = [];
  const transport =
    config.mode === "posthog"
      ? (config.transport ?? postHogTransport(config))
      : undefined;

  return {
    capabilities: privacyCapabilities,
    captured: () => [...events],
    async track(input) {
      if (config.mode === "disabled") {
        return { accepted: false, reason: "DISABLED" };
      }
      const rejection = validate(input);
      if (rejection) return rejection;

      const envelope: AnalyticsEnvelope = {
        event: input.name,
        properties: {
          ...input.properties,
          ...(config.mode === "fixture" && config.release
            ? { release: config.release }
            : {}),
        },
      };
      if (config.mode === "fixture") events.push(envelope);
      else await transport!(envelope);
      return { accepted: true };
    },
  };
}

export type {
  AnalyticsAdapter,
  AnalyticsEnvelope,
  AnalyticsEventInput,
  AnalyticsResult,
} from "./contract";
