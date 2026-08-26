import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";

import { buildAuditExportCsv } from "./domain";

function scopeText(scope: Json, key: string) {
  if (!scope || typeof scope !== "object" || Array.isArray(scope)) return "";
  const value = scope[key];
  return typeof value === "string" ? value : "";
}

export async function processAuditExports(limit = 5) {
  const client = createServiceSupabaseClient();
  const jobs = await client
    .from("export_jobs")
    .select("id,requested_by,scope,download_name")
    .eq("export_type", "audit")
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
        lease_owner: `audit-export-${job.id}`,
        lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (leased.error || !leased.data) continue;
    try {
      let query = client
        .from("audit_events")
        .select(
          "id,occurred_at,actor_class,action,entity_type,entity_id,result,source,correlation_id,retention_class,summary",
        )
        .order("occurred_at", { ascending: false })
        .limit(10_000);
      const action = scopeText(job.scope, "action");
      const result = scopeText(job.scope, "result");
      if (action) query = query.eq("action", action);
      if (result) query = query.eq("result", result);
      const rows = await query;
      if (rows.error) throw rows.error;
      const csv = buildAuditExportCsv(rows.data);
      const objectPath = `staff/${job.requested_by}/${job.id}/${job.download_name ?? "epoca-audit.csv"}`;
      const upload = await client.storage
        .from("catalog-exports")
        .upload(objectPath, csv, { contentType: "text/csv", upsert: false });
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
        .update({
          status: "failed",
          safe_error_code: "AUDIT_EXPORT_FAILED",
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
