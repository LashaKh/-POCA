import "server-only";

import { requireAdminPage } from "@/features/auth/admin-guard";

import { operationalReportSchema, parseReportFilters } from "./schema";

export async function getOperationalReport(
  raw: Record<string, string | string[] | undefined>,
) {
  const filters = parseReportFilters(raw);
  const { client } = await requireAdminPage();
  const [reportResult, exportsResult] = await Promise.all([
    client.rpc("read_operational_report", {
      p_from: filters.from,
      p_to: filters.to,
      p_currency: filters.currency,
    }),
    client
      .from("export_jobs")
      .select("id,status,row_count,download_name,expires_at,created_at")
      .eq("export_type", "operational-report")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (reportResult.error) throw reportResult.error;
  if (exportsResult.error) throw exportsResult.error;
  return {
    filters,
    report: operationalReportSchema.parse(reportResult.data),
    exports: exportsResult.data,
  };
}
