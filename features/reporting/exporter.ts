import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { csvCell } from "@/features/catalog/importer";
import { operationalReportSchema, type OperationalReport } from "./schema";

export function buildOperationalReportCsv(report: OperationalReport) {
  const rows: Array<[string, string | number]> = [
    ["period.from", report.period.from],
    ["period.toExclusive", report.period.to],
    ["period.timeZone", report.period.timeZone],
    ["period.currency", report.period.currency],
  ];
  for (const [section, values] of Object.entries(report).filter(
    ([key]) => key !== "period",
  )) {
    for (const [metric, value] of Object.entries(values)) {
      if (value !== null && typeof value === "object") {
        for (const [label, total] of Object.entries(value)) {
          if (typeof total === "number") {
            rows.push([`${section}.${metric}.${label}`, total]);
          }
        }
      } else if (typeof value === "string" || typeof value === "number") {
        rows.push([`${section}.${metric}`, value]);
      }
    }
  }
  return [
    ["metric", "value"].map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\r\n");
}

export async function processOperationalReportExports(limit = 5) {
  const client = createServiceSupabaseClient();
  const jobs = await client
    .from("export_jobs")
    .select("id,requested_by,scope,download_name")
    .eq("export_type", "operational-report")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);
  if (jobs.error) throw jobs.error;
  let completed = 0;
  let failed = 0;
  for (const job of jobs.data) {
    const leased = await client
      .from("export_jobs")
      .update({
        status: "leased",
        lease_owner: `report-${job.id}`,
        lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (leased.error || !leased.data) continue;
    try {
      const scope =
        job.scope && typeof job.scope === "object" && !Array.isArray(job.scope)
          ? job.scope
          : {};
      const result = await client.rpc("read_operational_report", {
        p_from: String(scope.from ?? ""),
        p_to: String(scope.to ?? ""),
        p_currency: String(scope.currency ?? "GEL"),
      });
      if (result.error) throw result.error;
      const report = operationalReportSchema.parse(result.data);
      const csv = buildOperationalReportCsv(report);
      const objectPath = `staff/${job.requested_by}/${job.id}/${job.download_name ?? "epoca-operational-report.csv"}`;
      const upload = await client.storage
        .from("catalog-exports")
        .upload(objectPath, csv, { contentType: "text/csv", upsert: false });
      if (upload.error) throw upload.error;
      const completion = await client
        .from("export_jobs")
        .update({
          status: "complete",
          object_path: objectPath,
          row_count: csv.split("\r\n").length - 1,
          completed_at: new Date().toISOString(),
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", job.id);
      if (completion.error) throw completion.error;
      completed += 1;
    } catch (error) {
      const errorCode =
        error instanceof Error
          ? "REPORT_EXPORT_FAILED"
          : "REPORT_EXPORT_INVALID";
      await client
        .from("export_jobs")
        .update({
          status: "failed",
          safe_error_code: errorCode,
          completed_at: new Date().toISOString(),
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", job.id);
      failed += 1;
    }
  }
  return { claimed: jobs.data.length, completed, failed };
}
