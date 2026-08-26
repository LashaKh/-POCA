"use client";

import { useActionState } from "react";

import {
  requestOperationalReportExportAction,
  type ReportExportState,
} from "@/features/reporting/actions";
import type { OperationalReport } from "@/features/reporting/schema";
import type { AppLocale } from "@/i18n/routing";
import { Notice } from "@/components/ui/notice";
import { formatMinorMoney } from "@/lib/money/format";
import { minorAmount } from "@/lib/money/minor";

export type ReportingLabels = {
  filter: string;
  from: string;
  to: string;
  currency: string;
  export: string;
  exportQueued: string;
  exportFailed: string;
  sales: string;
  payments: string;
  stock: string;
  ingestion: string;
  returns: string;
  operations: string;
  orders: string;
  netSales: string;
  discounts: string;
  attempts: string;
  availableUnits: string;
  lowStock: string;
  outOfStock: string;
  batches: string;
  failed: string;
  requests: string;
  open: string;
  openAlerts: string;
  dueWork: string;
  timezone: string;
  recentExports: string;
  noExports: string;
};

function money(
  value: number,
  currency: "GEL" | "USD" | "EUR",
  locale: AppLocale,
) {
  return formatMinorMoney(minorAmount(value), currency, locale);
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <article className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export function OperationalReportView({
  locale,
  report,
  filters,
  exports,
  labels,
}: {
  locale: AppLocale;
  report: OperationalReport;
  filters: {
    fromDate: string;
    toDate: string;
    currency: "GEL" | "USD" | "EUR";
  };
  exports: Array<{
    id: string;
    status: string;
    row_count: number | null;
    download_name: string | null;
    expires_at: string | null;
    created_at: string;
  }>;
  labels: ReportingLabels;
}) {
  const [state, exportAction, pending] = useActionState<
    ReportExportState,
    FormData
  >(requestOperationalReportExportAction, undefined);
  const format = (value: number) => money(value, filters.currency, locale);
  return (
    <>
      <form className="filter-bar admin-filters" method="get">
        <label>
          <span>{labels.from}</span>
          <input
            type="date"
            name="from"
            defaultValue={filters.fromDate}
            required
          />
        </label>
        <label>
          <span>{labels.to}</span>
          <input type="date" name="to" defaultValue={filters.toDate} required />
        </label>
        <label>
          <span>{labels.currency}</span>
          <select name="currency" defaultValue={filters.currency}>
            <option value="GEL">GEL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <button className="button" type="submit">
          {labels.filter}
        </button>
      </form>

      <p className="muted-copy">
        {labels.timezone}: {report.period.timeZone}
      </p>

      <div className="operation-grid report-grid">
        <section className="admin-panel">
          <h2>{labels.sales}</h2>
          <div className="metric-grid">
            <Metric value={report.sales.orderCount} label={labels.orders} />
            <Metric
              value={format(report.sales.netMinor)}
              label={labels.netSales}
            />
            <Metric
              value={format(report.sales.discountMinor)}
              label={labels.discounts}
            />
          </div>
        </section>
        <section className="admin-panel">
          <h2>{labels.payments}</h2>
          <div className="metric-grid">
            <Metric
              value={report.payments.attemptCount}
              label={labels.attempts}
            />
            <Metric
              value={format(report.payments.amountMinor)}
              label={labels.netSales}
            />
          </div>
        </section>
        <section className="admin-panel">
          <h2>{labels.stock}</h2>
          <div className="metric-grid">
            <Metric
              value={report.stock.availableUnits}
              label={labels.availableUnits}
            />
            <Metric value={report.stock.lowStock} label={labels.lowStock} />
            <Metric value={report.stock.outOfStock} label={labels.outOfStock} />
          </div>
        </section>
        <section className="admin-panel">
          <h2>{labels.ingestion}</h2>
          <div className="metric-grid">
            <Metric
              value={report.ingestion.batchCount}
              label={labels.batches}
            />
            <Metric value={report.ingestion.failed} label={labels.failed} />
          </div>
        </section>
        <section className="admin-panel">
          <h2>{labels.returns}</h2>
          <div className="metric-grid">
            <Metric
              value={report.returns.requestCount}
              label={labels.requests}
            />
            <Metric value={report.returns.open} label={labels.open} />
          </div>
        </section>
        <section className="admin-panel">
          <h2>{labels.operations}</h2>
          <div className="metric-grid">
            <Metric
              value={report.operations.openAlerts}
              label={labels.openAlerts}
            />
            <Metric
              value={report.operations.dueScheduledActions}
              label={labels.dueWork}
            />
          </div>
        </section>
      </div>

      <section className="admin-panel report-export-panel">
        <div className="section-heading">
          <div>
            <h2>{labels.recentExports}</h2>
            <p>{labels.export}</p>
          </div>
          <form action={exportAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="from" value={filters.fromDate} />
            <input type="hidden" name="to" value={filters.toDate} />
            <input type="hidden" name="currency" value={filters.currency} />
            <button className="button" type="submit" disabled={pending}>
              {pending ? `${labels.export}…` : labels.export}
            </button>
          </form>
        </div>
        {state?.ok ? (
          <Notice tone="success">{labels.exportQueued}</Notice>
        ) : null}
        {state && !state.ok ? (
          <Notice tone="error">{labels.exportFailed}</Notice>
        ) : null}
        {exports.length ? (
          <ul className="operations-event-list">
            {exports.map((job) => (
              <li key={job.id}>
                <strong>{job.download_name ?? "operational-report.csv"}</strong>
                <span>
                  {job.status}
                  {job.row_count === null ? "" : ` · ${job.row_count}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{labels.noExports}</p>
        )}
      </section>
    </>
  );
}
