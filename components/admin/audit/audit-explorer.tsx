"use client";

import { useActionState } from "react";

import { DangerConfirmation } from "@/components/admin/security/danger-confirmation";
import {
  requestAuditExportAction,
  type AuditExportState,
} from "@/features/audit/actions";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { Json } from "@/lib/supabase/database.types";

type AuditRow = {
  id: number;
  occurred_at: string;
  actor_class: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  result: string;
  source: string;
  correlation_id: string;
  retention_class: string;
  summary: Json;
};

export function AuditExplorer({
  locale,
  data,
}: {
  locale: AppLocale;
  data: {
    rows: AuditRow[];
    page: number;
    pageCount: number;
    filters: {
      query: string;
      action: string;
      result: string;
      correlationId: string;
    };
    exports: Array<{
      id: string;
      status: string;
      row_count: number | null;
      download_name: string | null;
      expires_at: string | null;
    }>;
  };
}) {
  const [exportState, exportAction] = useActionState<
    AuditExportState,
    FormData
  >(requestAuditExportAction, undefined);
  const queryString = new URLSearchParams({
    query: data.filters.query,
    action: data.filters.action,
    result: data.filters.result,
  }).toString();
  return (
    <>
      <form className="filter-bar" method="get">
        <label>
          <span>Search</span>
          <input name="query" defaultValue={data.filters.query} />
        </label>
        <label>
          <span>Action</span>
          <input name="action" defaultValue={data.filters.action} />
        </label>
        <label>
          <span>Result</span>
          <select name="result" defaultValue={data.filters.result}>
            <option value="">All</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="allowed">Allowed</option>
            <option value="denied">Denied</option>
          </select>
        </label>
        <button className="button" type="submit">
          Apply filters
        </button>
      </form>
      <div
        className="table-scroll admin-panel"
        role="region"
        aria-label="Audit event results"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action / entity</th>
              <th>Result</th>
              <th>Safe summary</th>
              <th>Correlation</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.occurred_at).toLocaleString(locale)}</td>
                <td>{row.actor_class}</td>
                <td>
                  <strong>{row.action}</strong>
                  <br />
                  {row.entity_type} · {row.entity_id ?? "—"}
                </td>
                <td>
                  {row.result}
                  <br />
                  <small>{row.retention_class}</small>
                </td>
                <td>
                  <code>{JSON.stringify(row.summary)}</code>
                </td>
                <td>
                  <Link
                    href={`/admin/audit?correlationId=${row.correlation_id}`}
                    locale={locale}
                  >
                    {row.correlation_id.slice(0, 8)}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="pagination" aria-label="Audit pages">
        <ul>
          <li>
            {data.page > 1 ? (
              <Link
                href={`/admin/audit?${queryString}&page=${data.page - 1}`}
                locale={locale}
              >
                Previous
              </Link>
            ) : null}
          </li>
          <li>
            Page {data.page} of {data.pageCount}
          </li>
          <li>
            {data.page < data.pageCount ? (
              <Link
                href={`/admin/audit?${queryString}&page=${data.page + 1}`}
                locale={locale}
              >
                Next
              </Link>
            ) : null}
          </li>
        </ul>
      </nav>
      <section className="admin-panel">
        <h2>Bounded audit export</h2>
        <p>
          Exports contain at most 10,000 safe audit rows and expire after two
          hours.
        </p>
        <form action={exportAction} className="stack-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="query" value={data.filters.query} />
          <input type="hidden" name="action" value={data.filters.action} />
          <input type="hidden" name="result" value={data.filters.result} />
          <DangerConfirmation
            phrase="EXPORT SENSITIVE audit"
            impact="This creates a time-limited file containing the current audit scope."
            alternative="Review the filtered records on screen without creating a file."
          />
          <button className="button" type="submit">
            Request safe CSV
          </button>
        </form>
        {exportState ? (
          <p role="status">
            {exportState.ok
              ? "Export queued."
              : `Export could not be queued. Reference ${exportState.correlationId}`}
          </p>
        ) : null}
        <ul className="plain-list">
          {data.exports.map((job) => (
            <li key={job.id}>
              {job.download_name} · {job.status} · {job.row_count ?? "pending"}{" "}
              rows{" "}
              {job.status === "complete" ? (
                <a href={`/${locale}/admin/audit/exports/${job.id}/download`}>
                  Download
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
