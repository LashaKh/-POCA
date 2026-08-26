import NextLink from "next/link";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBusinessDateTime } from "@/lib/datetime/format";

type DashboardData = Awaited<
  ReturnType<
    typeof import("@/features/operations/overview").getOperationsOverview
  >
>;

function formatDate(value: string | null) {
  return value ? formatBusinessDateTime(value) : "—";
}

export type OperationsLabels = {
  status: string;
  readiness: string;
  blockers: string;
  health: string;
  queues: string;
  alerts: string;
  scheduler: string;
  notifications: string;
  release: string;
  noAlerts: string;
  noRuns: string;
  noRelease: string;
  diagnostic: string;
  audit: string;
  configuration: string;
  environment: string;
  checked: string;
  occurrences: string;
  scheduledFor: string;
  completed: string;
};

export function HealthDashboard({
  locale,
  data,
  labels,
}: {
  locale: AppLocale;
  data: DashboardData;
  labels: OperationsLabels;
}) {
  return (
    <div className="operations-control-room">
      <section className="admin-panel" aria-labelledby="readiness-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{labels.status}</p>
            <h2 id="readiness-heading">{labels.readiness}</h2>
          </div>
          <span className={`status-chip status-${data.readiness.decision}`}>
            {data.readiness.highestStage} · {data.readiness.decision}
          </span>
        </div>
        {data.readiness.blockers.length ? (
          <div className="readiness-blockers">
            <h3>{labels.blockers}</h3>
            <ul>
              {data.readiness.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <nav className="operations-evidence-links" aria-label={labels.status}>
          <NextLink href="/api/health/ready?details=1">
            {labels.diagnostic}
          </NextLink>
          <Link href="/admin/audit" locale={locale}>
            {labels.audit}
          </Link>
          <Link href="/admin/settings/integrations" locale={locale}>
            {labels.configuration}
          </Link>
        </nav>
      </section>

      <div className="operation-grid">
        <section className="admin-panel" aria-labelledby="health-heading">
          <div className="section-heading">
            <h2 id="health-heading">{labels.health}</h2>
            <span className={`status-chip status-${data.health.overall}`}>
              {data.health.overall}
            </span>
          </div>
          <dl className="detail-list">
            <div>
              <dt>{labels.environment}</dt>
              <dd>{data.health.environment}</dd>
            </div>
            <div>
              <dt>{labels.release}</dt>
              <dd>{data.health.release}</dd>
            </div>
            <div>
              <dt>{labels.checked}</dt>
              <dd>{formatDate(data.health.checkedAt)}</dd>
            </div>
          </dl>
          <div
            className="admin-table-scroll"
            tabIndex={0}
            aria-label={labels.health}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Check</th>
                  <th scope="col">State</th>
                  <th scope="col">Age</th>
                  <th scope="col">Code</th>
                </tr>
              </thead>
              <tbody>
                {data.health.checks.map((check) => (
                  <tr key={check.key}>
                    <th scope="row">{check.key}</th>
                    <td>{check.status}</td>
                    <td>
                      {check.ageSeconds === undefined
                        ? "—"
                        : `${check.ageSeconds}s`}
                    </td>
                    <td>{check.code ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel" aria-labelledby="queue-heading">
          <h2 id="queue-heading">{labels.queues}</h2>
          <div className="metric-grid">
            {Object.entries(data.health.queues).map(([queue, value]) => (
              <article className="metric-card" key={queue}>
                <strong>{value.depth}</strong>
                <span>{queue}</span>
                <small>oldest · {value.oldestAgeSeconds}s</small>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="operation-grid">
        <section className="admin-panel" aria-labelledby="alerts-heading">
          <h2 id="alerts-heading">{labels.alerts}</h2>
          {data.alerts.length ? (
            <ul className="operations-event-list">
              {data.alerts.map((alert) => (
                <li key={alert.id}>
                  <div>
                    <strong>{alert.safe_summary}</strong>
                    <span>
                      {alert.category} · {alert.severity} · {alert.status}
                    </span>
                  </div>
                  <small>
                    {labels.occurrences}: {alert.occurrence_count} ·{" "}
                    {formatDate(alert.last_seen_at)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>{labels.noAlerts}</p>
          )}
        </section>

        <section className="admin-panel" aria-labelledby="scheduler-heading">
          <h2 id="scheduler-heading">{labels.scheduler}</h2>
          {data.runs.length ? (
            <ul className="operations-event-list">
              {data.runs.map((run) => (
                <li key={run.id}>
                  <div>
                    <strong>{run.actionType}</strong>
                    <span>
                      {run.status} · {run.safe_error_code ?? "OK"}
                    </span>
                  </div>
                  <small>
                    {labels.scheduledFor}: {formatDate(run.scheduled_for)}
                    <br />
                    {labels.completed}: {formatDate(run.completed_at)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p>{labels.noRuns}</p>
          )}
        </section>
      </div>

      <div className="operation-grid">
        <section
          className="admin-panel"
          aria-labelledby="notifications-heading"
        >
          <h2 id="notifications-heading">{labels.notifications}</h2>
          <div className="metric-grid">
            {Object.entries(data.notificationCounts).map(([status, count]) => (
              <article className="metric-card" key={status}>
                <strong>{count}</strong>
                <span>{status}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="admin-panel" aria-labelledby="release-heading">
          <h2 id="release-heading">{labels.release}</h2>
          {data.release ? (
            <dl className="detail-list">
              <div>
                <dt>ID</dt>
                <dd>{data.release.release_id}</dd>
              </div>
              <div>
                <dt>Stage</dt>
                <dd>{data.release.stage}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{data.release.status}</dd>
              </div>
              <div>
                <dt>Schema</dt>
                <dd>{data.release.schema_version}</dd>
              </div>
            </dl>
          ) : (
            <p>{labels.noRelease}</p>
          )}
        </section>
      </div>
    </div>
  );
}
