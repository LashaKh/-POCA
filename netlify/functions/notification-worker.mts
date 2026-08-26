import { processNotificationOutbox } from "../../features/operations/notification-worker";
import { logger } from "../../lib/observability/logger";

export default async function notificationWorker() {
  const correlationId = crypto.randomUUID();
  try {
    const result = await processNotificationOutbox({ limit: 25 });
    logger.info({
      correlationId,
      event: "notification.worker",
      actorClass: "service",
      outcome: "succeeded",
      metadata: result,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    logger.error({
      correlationId,
      event: "notification.worker",
      actorClass: "service",
      outcome: "failed",
      metadata: {
        errorCode: error instanceof Error ? error.name : "UNKNOWN_WORKER_ERROR",
      },
    });
    return Response.json({ ok: false, correlationId }, { status: 500 });
  }
}
