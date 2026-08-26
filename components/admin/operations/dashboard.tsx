import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function OperationsDashboard({
  locale,
  summary,
}: {
  locale: AppLocale;
  summary: {
    pendingPayments: number;
    transferReviews: number;
    fulfillment: number;
    failedNotifications: number;
    providerFailures: number;
    alerts: number;
    lowStock: number;
    missingTranslations: number;
    failedIngestion: number;
    openReturns: number;
    oldestOpenMinutes: number;
  };
}) {
  const cards = [
    [
      "Payment attention",
      summary.pendingPayments,
      "/admin/orders?paymentStatus=reconciliation_required",
    ],
    [
      "Transfer reviews",
      summary.transferReviews,
      "/admin/orders?paymentStatus=bank_transfer_review",
    ],
    ["Fulfillment", summary.fulfillment, "/admin/orders?status=confirmed"],
    ["Notification failures", summary.failedNotifications, "/admin/orders"],
    ["Provider-event failures", summary.providerFailures, "/admin/orders"],
    ["Open alerts", summary.alerts, "/admin/orders"],
    ["Low stock", summary.lowStock, "/admin/products?stock=low"],
    [
      "Missing translations",
      summary.missingTranslations,
      "/admin/products?translation=missing",
    ],
    ["Failed ingestion", summary.failedIngestion, "/admin/ingestion"],
    ["Open returns", summary.openReturns, "/admin/returns"],
  ] as const;
  return (
    <section
      className="admin-panel"
      aria-labelledby="operations-dashboard-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">OPERATIONS</p>
          <h2 id="operations-dashboard-title">Order control room</h2>
        </div>
        <span className="status-chip">
          Oldest open · {summary.oldestOpenMinutes} min
        </span>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, href]) => (
          <Link
            key={label}
            className="metric-card"
            href={href}
            locale={locale}
            aria-label={`${label}: ${value}`}
          >
            <strong>{value}</strong>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
