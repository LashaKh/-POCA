import { randomUUID } from "node:crypto";

import { isKnownEvent } from "./events";
import { redactForLog } from "./redact";

type LogLevel = "info" | "warn" | "error";

export type SafeLogContext = {
  correlationId: string;
  event: string;
  actorClass?:
    | "anonymous"
    | "guest"
    | "customer"
    | "manager"
    | "owner"
    | "service";
  outcome?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

export function createCorrelationId() {
  return randomUUID();
}

export function createLogRecord(
  level: LogLevel,
  context: SafeLogContext,
  now = new Date(),
) {
  const safeContext = redactForLog(context);
  const contextRecord =
    safeContext !== null &&
    typeof safeContext === "object" &&
    !Array.isArray(safeContext)
      ? safeContext
      : {};
  const safeEvent = isKnownEvent(context.event)
    ? context.event
    : "observability.invalid-event";
  return {
    timestamp: now.toISOString(),
    level,
    ...contextRecord,
    event: safeEvent,
  };
}

function write(level: LogLevel, context: SafeLogContext) {
  const record = JSON.stringify(createLogRecord(level, context));

  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}

export const logger = {
  info: (context: SafeLogContext) => write("info", context),
  warn: (context: SafeLogContext) => write("warn", context),
  error: (context: SafeLogContext) => write("error", context),
};
