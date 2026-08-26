import type { Json } from "@/lib/supabase/database.types";

const forbiddenKey =
  /(password|secret|token|authorization|cookie|email|phone|address|ip)/i;
const emailLike = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;

export function redactAuditSummary(value: Json): Json {
  if (typeof value === "string")
    return value.replaceAll(emailLike, "[redacted]");
  if (Array.isArray(value)) return value.map(redactAuditSummary);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        forbiddenKey.test(key)
          ? "[redacted]"
          : redactAuditSummary(entry ?? null),
      ]),
    );
  }
  return value;
}

export const auditExportColumns = [
  "id",
  "occurred_at",
  "actor_class",
  "action",
  "entity_type",
  "entity_id",
  "result",
  "source",
  "correlation_id",
  "retention_class",
  "summary",
] as const;

function cell(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const protectedText = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + protectedText.replaceAll('"', '""') + '"';
}

export function buildAuditExportCsv(
  rows: Array<Record<(typeof auditExportColumns)[number], Json | undefined>>,
) {
  return [
    auditExportColumns.map(cell).join(","),
    ...rows.map((row) =>
      auditExportColumns.map((column) => cell(row[column])).join(","),
    ),
  ].join("\r\n");
}
