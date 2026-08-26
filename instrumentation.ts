export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const [{ getServerEnvironment }, { logger }, { createCorrelationId }] =
    await Promise.all([
      import("@/lib/env/server"),
      import("@/lib/observability/logger"),
      import("@/lib/observability/correlation"),
    ]);

  const env = getServerEnvironment();
  logger.info({
    correlationId: createCorrelationId(),
    event: "application.runtime.ready",
    actorClass: "service",
    metadata: { deployEnvironment: env.DEPLOY_ENV },
  });
}
