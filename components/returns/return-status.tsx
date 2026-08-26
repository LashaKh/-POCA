import { removeReturnEvidenceAction } from "@/features/returns/evidence";
import type { AppLocale } from "@/i18n/routing";

import { ReturnEvidenceUpload } from "./evidence-upload";

export function ReturnStatus({
  locale,
  orderReference,
  request,
  labels,
}: {
  locale: AppLocale;
  orderReference: string;
  request: {
    id: string;
    reference: string;
    request_kind: string;
    status: string;
    reason_code: string;
    decision_reason?: string | null;
    buyer_note: string | null;
    policy_version: string;
    policy_snapshot: unknown;
    created_at: string;
    return_events: Array<{
      id: number;
      event_type: string;
      occurred_at: string;
    }>;
    return_messages: Array<{ id: string; body: string; created_at: string }>;
    return_evidence: Array<{
      id: string;
      original_filename: string;
      status: string;
      signedUrl?: string;
    }>;
  };
  labels: Record<string, string>;
}) {
  const acceptsEvidence = ["requested", "needs_information"].includes(
    request.status,
  );
  return (
    <section
      className="account-panel return-status"
      aria-labelledby="return-status-heading"
    >
      <header>
        <p className="eyebrow">
          {labels[`kind_${request.request_kind}`] ?? request.request_kind}
        </p>
        <h2 id="return-status-heading">{request.reference}</h2>
        <p>
          {labels.status}:{" "}
          <strong>
            {labels[`status_${request.status}`] ?? request.status}
          </strong>
        </p>
      </header>
      <dl className="facts-list">
        <div>
          <dt>{labels.reason}</dt>
          <dd>
            {labels[`reason_${request.reason_code}`] ?? request.reason_code}
          </dd>
        </div>
        {request.decision_reason ? (
          <div>
            <dt>{labels.decision}</dt>
            <dd>{request.decision_reason}</dd>
          </div>
        ) : null}
        <div>
          <dt>{labels.policy}</dt>
          <dd>{request.policy_version}</dd>
        </div>
      </dl>
      {request.return_messages.length ? (
        <section>
          <h3>{labels.messages}</h3>
          <ul>
            {request.return_messages.map((message) => (
              <li key={message.id}>{message.body}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h3>{labels.timeline}</h3>
        <ol>
          {request.return_events
            .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
            .map((event) => (
              <li key={event.id}>
                <time dateTime={event.occurred_at}>
                  {new Date(event.occurred_at).toLocaleString(locale)}
                </time>{" "}
                · {labels[`event_${event.event_type}`] ?? event.event_type}
              </li>
            ))}
        </ol>
      </section>
      <section>
        <h3>{labels.evidence}</h3>
        {request.return_evidence.length ? (
          <ul>
            {request.return_evidence.map((evidence) => (
              <li key={evidence.id}>
                {evidence.signedUrl ? (
                  <a href={evidence.signedUrl}>{evidence.original_filename}</a>
                ) : (
                  evidence.original_filename
                )}{" "}
                ·{" "}
                {labels[`evidence_status_${evidence.status}`] ??
                  evidence.status}
                {acceptsEvidence && evidence.status === "attached" ? (
                  <form action={removeReturnEvidenceAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="returnRequestId"
                      value={request.id}
                    />
                    <input
                      type="hidden"
                      name="orderReference"
                      value={orderReference}
                    />
                    <input
                      type="hidden"
                      name="evidenceId"
                      value={evidence.id}
                    />
                    <button className="text-button" type="submit">
                      {labels.remove}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>{labels.noEvidence}</p>
        )}
        {acceptsEvidence ? (
          <ReturnEvidenceUpload
            locale={locale}
            returnRequestId={request.id}
            orderReference={orderReference}
            labels={labels}
          />
        ) : null}
      </section>
    </section>
  );
}
