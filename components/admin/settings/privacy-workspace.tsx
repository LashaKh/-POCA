"use client";

import { useActionState, useState } from "react";

import { DangerConfirmation } from "@/components/admin/security/danger-confirmation";
import {
  requestPrivacyAction,
  type PrivacyActionState,
} from "@/features/privacy/admin-actions";
import type { AppLocale } from "@/i18n/routing";

export function PrivacyWorkspace({
  locale,
  profiles,
  requests,
}: {
  locale: AppLocale;
  profiles: Array<{
    id: string;
    display_name: string | null;
    profile_kind: string;
  }>;
  requests: Array<{
    id: string;
    request_type: string;
    status: string;
    subject_profile_id: string;
    created_at: string;
    safe_result_code: string | null;
  }>;
}) {
  const [state, action] = useActionState<PrivacyActionState, FormData>(
    requestPrivacyAction,
    undefined,
  );
  const [subject, setSubject] = useState(profiles[0]?.id ?? "");
  const [kind, setKind] = useState<
    "access" | "export" | "correction" | "deletion"
  >("access");
  const protectedPhrase =
    kind === "deletion"
      ? `PRIVACY DELETE ${subject}`
      : `EXPORT SENSITIVE ${subject}`;
  return (
    <>
      <section className="admin-panel">
        <h2>Open a customer-data request</h2>
        <p>
          Requests are queued, versioned, and verified before any data is
          changed. Deletion is never executed from this screen.
        </p>
        <form action={action} className="stack-form">
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>Subject</span>
            <select
              name="subjectProfileId"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name ?? profile.id} · {profile.profile_kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Request</span>
            <select
              name="requestType"
              value={kind}
              onChange={(event) => setKind(event.target.value as typeof kind)}
            >
              <option value="access">Access</option>
              <option value="export">Bounded export</option>
              <option value="correction">Correction</option>
              <option value="deletion">Deletion review</option>
            </select>
          </label>
          {kind === "deletion" || kind === "export" ? (
            <DangerConfirmation
              phrase={protectedPhrase}
              impact={
                kind === "deletion"
                  ? "This opens an irreversible-deletion review. Legal and financial retention still apply."
                  : "This opens a bounded export request containing personal data."
              }
              alternative={
                kind === "deletion"
                  ? "Correct or restrict the data while retention obligations are reviewed."
                  : "Review a single customer record without generating a portable file."
              }
            />
          ) : (
            <label>
              <span>Reason and verification notes</span>
              <textarea name="reason" minLength={2} maxLength={500} required />
            </label>
          )}
          <button className="button" type="submit" disabled={!subject}>
            Record request
          </button>
        </form>
        {state ? (
          <p role="status">
            {state.ok
              ? `Request recorded: ${state.data.id}`
              : `Request failed. Reference ${state.correlationId}`}
          </p>
        ) : null}
      </section>
      <section className="admin-panel">
        <h2>Retention schedule</h2>
        <div
          className="table-scroll"
          role="region"
          aria-label="Retention schedule"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Record</th>
                <th>Minimum handling</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Orders and financial events</td>
                <td>6 years</td>
                <td>Accounting, disputes, and fraud evidence</td>
              </tr>
              <tr>
                <td>Security audit</td>
                <td>2 years</td>
                <td>Access and incident evidence</td>
              </tr>
              <tr>
                <td>Operational audit</td>
                <td>1 year</td>
                <td>Shop change history</td>
              </tr>
              <tr>
                <td>Expired sessions and exports</td>
                <td>30 days / 2 hours</td>
                <td>Security review / minimum exposure</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel">
        <h2>Request history</h2>
        <div
          className="table-scroll"
          role="region"
          aria-label="Privacy request history"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{new Date(request.created_at).toLocaleString(locale)}</td>
                  <td>{request.subject_profile_id}</td>
                  <td>{request.request_type}</td>
                  <td>{request.status}</td>
                  <td>{request.safe_result_code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
