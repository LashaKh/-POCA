import "server-only";

import { z } from "zod";

import { requireOwnerPage } from "@/features/auth/admin-guard";
import type { AppLocale } from "@/i18n/routing";
import { redactAuditSummary } from "./domain";

const PAGE_SIZE = 30;
const filtersSchema = z.object({
  query: z.string().trim().max(100).default(""),
  action: z.string().trim().max(120).default(""),
  result: z.enum(["", "allowed", "denied", "succeeded", "failed"]).default(""),
  correlationId: z.string().trim().max(36).default(""),
  page: z.coerce.number().int().positive().default(1),
});

export async function getAuditEvents(locale: AppLocale, raw: unknown) {
  const filters = filtersSchema.parse(raw);
  const { client } = await requireOwnerPage(locale, "/admin/audit");
  let query = client.from("audit_events").select("*", { count: "exact" });
  if (filters.query) {
    const safe = filters.query.replaceAll(/[,%()]/g, "");
    query = query.or(
      `action.ilike.%${safe}%,entity_id.ilike.%${safe}%,source.ilike.%${safe}%`,
    );
  }
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.result) query = query.eq("result", filters.result);
  if (filters.correlationId)
    query = query.eq("correlation_id", filters.correlationId);
  const start = (filters.page - 1) * PAGE_SIZE;
  const result = await query
    .order("occurred_at", { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  if (result.error) throw result.error;
  const exports = await client
    .from("export_jobs")
    .select("id,status,row_count,download_name,expires_at,created_at")
    .eq("export_type", "audit")
    .order("created_at", { ascending: false })
    .limit(10);
  if (exports.error) throw exports.error;
  return {
    rows: result.data.map((row) => ({
      ...row,
      summary: redactAuditSummary(row.summary),
    })),
    count: result.count ?? 0,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil((result.count ?? 0) / PAGE_SIZE)),
    filters,
    exports: exports.data,
  };
}
