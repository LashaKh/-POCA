import { runScheduledCoordinator } from "../../features/operations/coordinator";
import { logger } from "../../lib/observability/logger";

export default async function scheduledCoordinator() {
  const correlationId = crypto.randomUUID();
  try {
    const result = await runScheduledCoordinator();
    logger.info({
      correlationId,
      event: "scheduled.coordinator",
      actorClass: "service",
      outcome: "succeeded",
      durationMs: result.durationMs,
      metadata: result,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    logger.error({
      correlationId,
      event: "scheduled.coordinator",
      actorClass: "service",
      outcome: "failed",
      metadata: {
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      },
    });
    return new Response(JSON.stringify({ ok: false, correlationId }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const config = { schedule: "*/5 * * * *" };
