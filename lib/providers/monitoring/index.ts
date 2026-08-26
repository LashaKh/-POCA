import { randomUUID } from "node:crypto";

import { isKnownEvent } from "@/lib/observability/events";
import { redactForLog } from "@/lib/observability/redact";

import {
  type MonitoringAdapter,
  type MonitoringEnvelope,
  type MonitoringInput,
  monitoringPrivacy,
} from "./contract";

export type MonitoringAdapterConfig =
  | { mode: "disabled" }
  | { mode: "fixture"; release?: string; environment?: string }
  | {
      mode: "sentry";
      dsn: string;
      release: string;
      environment: string;
      transport?: (payload: MonitoringEnvelope) => Promise<void>;
    };

function sentryTransport(dsn: string) {
  const parsed = new URL(dsn);
  const projectId = parsed.pathname.replace(/^\//, "");
  const publicKey = parsed.username;
  if (!projectId || !publicKey || parsed.protocol !== "https:") {
    throw new Error("INVALID_SENTRY_DSN");
  }
  const endpoint = new URL(
    `/api/${projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}&sentry_client=epoca%2F1.0`,
    `${parsed.protocol}//${parsed.host}`,
  );
  return async (payload: MonitoringEnvelope) => {
    const event = {
      event_id: payload.eventId.replaceAll("-", ""),
      timestamp: payload.timestamp,
      level: "error",
      release: payload.release,
      environment: payload.environment,
      tags: {
        event: payload.event,
        safe_error_code: payload.safeErrorCode,
      },
      contexts: {
        trace: { correlation_id: payload.correlationId },
        safe_metadata: payload.metadata,
      },
      exception: {
        values: [{ type: "SafeOperationalError", value: "[redacted-error]" }],
      },
    };
    const envelope = `${JSON.stringify({ event_id: event.event_id })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
    await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
      keepalive: true,
    });
  };
}

function envelope(
  input: MonitoringInput,
  config: { release?: string; environment?: string },
): MonitoringEnvelope {
  return {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    correlationId: input.correlationId,
    event: isKnownEvent(input.event)
      ? input.event
      : "observability.invalid-event",
    safeErrorCode: /^[A-Z0-9_]{2,80}$/.test(input.safeErrorCode)
      ? input.safeErrorCode
      : "INVALID_ERROR_CODE",
    error: redactForLog(input.error),
    metadata: redactForLog(input.metadata ?? {}),
    release: config.release,
    environment: config.environment,
  };
}

export function createMonitoringAdapter(
  config: MonitoringAdapterConfig,
): MonitoringAdapter {
  const events: MonitoringEnvelope[] = [];
  const transport =
    config.mode === "sentry"
      ? (config.transport ?? sentryTransport(config.dsn))
      : undefined;
  return {
    privacy: monitoringPrivacy,
    captured: () => [...events],
    async capture(input) {
      if (config.mode === "disabled") return { accepted: false };
      const captured = envelope(input, config);
      if (config.mode === "fixture") events.push(captured);
      else await transport!(captured);
      return { accepted: true };
    },
  };
}

export type {
  MonitoringAdapter,
  MonitoringEnvelope,
  MonitoringInput,
} from "./contract";
