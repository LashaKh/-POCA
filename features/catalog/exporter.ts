import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

import { csvCell } from "./importer";

const columns = [
  "id",
  "sku",
  "status",
  "name",
  "locale",
  "slug",
  "currency",
  "amount_minor",
  "stock_model",
  "on_hand_quantity",
  "reserved_quantity",
  "updated_at",
] as const;

export function buildCatalogExportCsv(
  rows: Array<Record<(typeof columns)[number], unknown>>,
) {
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvCell(row[column])).join(","),
    ),
  ].join("\r\n");
}

export function catalogExportFailureRecord(completedAt: string) {
  return {
    status: "failed" as const,
    safe_error_code: "CATALOG_EXPORT_FAILED",
    completed_at: completedAt,
    lease_owner: null,
    lease_expires_at: null,
  };
}

export async function processCatalogExports(limit = 5) {
  const client = createServiceSupabaseClient();
  const { data: jobs, error } = await client
    .from("export_jobs")
    .select("id,requested_by,scope,download_name")
    .eq("export_type", "catalog")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);
  if (error) throw error;
  let completed = 0;
  let failed = 0;
  for (const job of jobs) {
    const leased = await client
      .from("export_jobs")
      .update({
        status: "leased",
        lease_owner: `export-${job.id}`,
        lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (leased.error || !leased.data) continue;
    try {
      let query = client.from("catalog_export_rows").select("*").limit(10_000);
      const status =
        typeof job.scope === "object" && job.scope && "status" in job.scope
          ? String(job.scope.status)
          : "all";
      if (status !== "all") query = query.eq("status", status);
      const rows = await query;
      if (rows.error) throw rows.error;
      const csv = buildCatalogExportCsv(rows.data);
      const objectPath = `staff/${job.requested_by}/${job.id}/${job.download_name ?? "epoca-catalog.csv"}`;
      const upload = await client.storage
        .from("catalog-exports")
        .upload(objectPath, csv, {
          contentType: "text/csv",
          upsert: false,
        });
      if (upload.error) throw upload.error;
      const completion = await client
        .from("export_jobs")
        .update({
          status: "complete",
          object_path: objectPath,
          row_count: rows.data.length,
          completed_at: new Date().toISOString(),
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", job.id);
      if (completion.error) throw completion.error;
      completed += 1;
    } catch {
      await client
        .from("export_jobs")
        .update(catalogExportFailureRecord(new Date().toISOString()))
        .eq("id", job.id);
      failed += 1;
    }
  }
  return { claimed: jobs.length, completed, failed };
}
