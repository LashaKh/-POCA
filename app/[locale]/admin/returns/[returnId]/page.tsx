import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { ReturnOperations } from "@/components/admin/returns/return-operations";
import { getAdminReturnDetail } from "@/features/returns/queries";
import { isAppLocale } from "@/i18n/routing";

export default async function AdminReturnDetailPage({
  params,
}: {
  params: Promise<{ locale: string; returnId: string }>;
}) {
  const { locale, returnId } = await params;
  if (!isAppLocale(locale)) return null;
  const [t, tr, request] = await Promise.all([
    getTranslations({ locale, namespace: "admin.returns" }),
    getTranslations({ locale, namespace: "returns" }),
    getAdminReturnDetail(returnId),
  ]);
  if (!request) notFound();
  return (
    <main className="admin-main" id="main-content">
      <header className="admin-page-header">
        <p className="eyebrow">{t(`kinds.${request.request_kind}`)}</p>
        <h1>{request.reference}</h1>
        <p>
          {t("order")}: {request.orders.reference} ·{" "}
          {t(`statuses.${request.status}`)}
        </p>
      </header>
      <div className="admin-card-grid">
        <section className="admin-card">
          <h2>{t("buyerRequest")}</h2>
          <p>
            {t("reason")}: {tr(`reason_${request.reason_code}`)}
          </p>
          <p>{request.buyer_note}</p>
          {request.decision_reason ? (
            <p>
              {t("decisionReason")}: {request.decision_reason}
            </p>
          ) : null}
          <p>
            {t("policy")}: {request.policy_version}
          </p>
        </section>
        <section className="admin-card">
          <h2>{t("evidence")}</h2>
          {request.return_evidence.length ? (
            <ul>
              {request.return_evidence.map((evidence) => (
                <li key={evidence.id}>
                  {"signedUrl" in evidence &&
                  typeof evidence.signedUrl === "string" ? (
                    <a href={evidence.signedUrl}>
                      {evidence.original_filename}
                    </a>
                  ) : (
                    evidence.original_filename
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t("noEvidence")}</p>
          )}
        </section>
      </div>
      <ReturnOperations
        locale={locale}
        request={request}
        labels={t.raw("operations")}
      />
      <section className="admin-panel">
        <h2>{t("timeline")}</h2>
        <ol className="timeline-list">
          {request.return_events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.occurred_at}>
                {new Date(event.occurred_at).toLocaleString(locale)}
              </time>{" "}
              · {tr(`event_${event.event_type}`)}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
