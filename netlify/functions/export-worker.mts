import { processCatalogExports } from "../../features/catalog/exporter";
import { processAuditExports } from "../../features/audit/exporter";
import { processOperationalReportExports } from "../../features/reporting/exporter";
import { logger } from "../../lib/observability/logger";

export default async function exportWorker() {
  const correlationId = crypto.randomUUID();
  try {
    const [catalog, audit, reporting] = await Promise.all([
      processCatalogExports(),
      processAuditExports(),
      processOperationalReportExports(),
    ]);
    const result = { catalog, audit, reporting };
    logger.info({
      correlationId,
      event: "catalog.export.worker",
      actorClass: "service",
      outcome: "succeeded",
      metadata: result,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    logger.error({
      correlationId,
      event: "catalog.export.worker",
      actorClass: "service",
      outcome: "failed",
      metadata: {
        errorCode:
          error instanceof Error ? error.name : "CATALOG_EXPORT_FAILED",
      },
    });
    return Response.json({ ok: false, correlationId }, { status: 500 });
  }
}
