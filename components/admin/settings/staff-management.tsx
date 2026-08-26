"use client";

import { useActionState } from "react";

import { DangerConfirmation } from "@/components/admin/security/danger-confirmation";
import {
  inviteStaffAction,
  manageStaffAction,
  revokeStaffSessionsAction,
  type StaffActionState,
} from "@/app/[locale]/admin/settings/staff/actions";
import type { AppLocale } from "@/i18n/routing";

type StaffRow = {
  profile_id: string;
  role: "owner" | "manager";
  active: boolean;
  mfa_required: boolean;
  version: number;
  deactivated_at: string | null;
  profiles: { display_name: string | null } | null;
};

function Result({ state }: { state: StaffActionState }) {
  if (!state) return null;
  return (
    <p
      className={state.ok ? "notice notice-success" : "notice notice-error"}
      role="status"
    >
      {state.ok
        ? "Change completed."
        : `Change failed. Reference ${state.correlationId}`}
    </p>
  );
}

function StaffControls({ row, locale }: { row: StaffRow; locale: AppLocale }) {
  const [changeState, changeAction] = useActionState<
    StaffActionState,
    FormData
  >(manageStaffAction, undefined);
  const [sessionState, sessionAction] = useActionState<
    StaffActionState,
    FormData
  >(revokeStaffSessionsAction, undefined);
  const roleTarget = row.role === "owner" ? "manager" : "owner";
  const rolePhrase = `STAFF ROLE CHANGE ${row.profile_id}`;
  const deactivatePhrase = `STAFF DEACTIVATE ${row.profile_id}`;
  const sessionPhrase = `SESSION REVOKE ALL ${row.profile_id}`;
  return (
    <div className="staff-control-stack">
      <details>
        <summary>
          {row.active
            ? `Change role to ${roleTarget}`
            : "Reactivate staff member"}
        </summary>
        <form action={changeAction} className="stack-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="profileId" value={row.profile_id} />
          <input type="hidden" name="expectedVersion" value={row.version} />
          <input
            type="hidden"
            name="role"
            value={row.active ? roleTarget : row.role}
          />
          <input type="hidden" name="active" value="true" />
          {row.active ? (
            <DangerConfirmation
              phrase={rolePhrase}
              impact={`This changes the account from ${row.role} to ${roleTarget}.`}
              alternative="Keep the current role and revoke sessions if access is uncertain."
            />
          ) : (
            <label>
              <span>Reason for reactivation</span>
              <textarea name="reason" minLength={2} maxLength={500} required />
            </label>
          )}
          <button className="button" type="submit">
            Confirm
          </button>
        </form>
      </details>
      {row.active ? (
        <details>
          <summary>Deactivate access</summary>
          <form action={changeAction} className="stack-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="profileId" value={row.profile_id} />
            <input type="hidden" name="expectedVersion" value={row.version} />
            <input type="hidden" name="role" value={row.role} />
            <input type="hidden" name="active" value="false" />
            <DangerConfirmation
              phrase={deactivatePhrase}
              impact="This immediately blocks administration and revokes every active session."
              alternative="Revoke sessions first while keeping the account active."
            />
            <button className="button" type="submit">
              Deactivate
            </button>
          </form>
        </details>
      ) : null}
      <details>
        <summary>Revoke all sessions</summary>
        <form action={sessionAction} className="stack-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="profileId" value={row.profile_id} />
          <DangerConfirmation
            phrase={sessionPhrase}
            impact="Every current browser session for this account will end."
            alternative="Ask the staff member to sign out other sessions themselves."
          />
          <button className="button" type="submit">
            Revoke sessions
          </button>
        </form>
      </details>
      <Result state={changeState ?? sessionState} />
    </div>
  );
}

export function StaffManagement({
  locale,
  staff,
  invitations,
}: {
  locale: AppLocale;
  staff: StaffRow[];
  invitations: Array<{
    id: string;
    email: string;
    role: "owner" | "manager";
    status: string;
    expires_at: string;
  }>;
}) {
  const [inviteState, inviteAction] = useActionState<
    StaffActionState,
    FormData
  >(inviteStaffAction, undefined);
  return (
    <>
      <section className="admin-panel" aria-labelledby="invite-title">
        <h2 id="invite-title">Invite staff</h2>
        <p>
          The invitation link expires after seven days. Owners must enroll MFA.
        </p>
        <form action={inviteAction} className="settings-form-grid">
          <input type="hidden" name="locale" value={locale} />
          <label>
            <span>Name</span>
            <input name="displayName" maxLength={160} required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="off" required />
          </label>
          <label>
            <span>Role</span>
            <select name="role" defaultValue="manager">
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <button className="button" type="submit">
            Send secure invitation
          </button>
        </form>
        <Result state={inviteState} />
      </section>
      <section className="admin-panel" aria-labelledby="staff-title">
        <h2 id="staff-title">Staff access</h2>
        <div
          className="table-scroll"
          role="region"
          aria-label="Staff access table"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Security actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((row) => (
                <tr key={row.profile_id}>
                  <td>{row.profiles?.display_name ?? row.profile_id}</td>
                  <td>
                    {row.role}
                    {row.mfa_required ? " · MFA required" : ""}
                  </td>
                  <td>
                    {row.active
                      ? "Active"
                      : `Inactive${row.deactivated_at ? ` since ${new Date(row.deactivated_at).toLocaleDateString(locale)}` : ""}`}
                  </td>
                  <td>
                    <StaffControls row={row} locale={locale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel" aria-labelledby="pending-title">
        <h2 id="pending-title">Invitation history</h2>
        {invitations.length ? (
          <ul className="plain-list">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <strong>{invitation.email}</strong> · {invitation.role} ·{" "}
                {invitation.status} · expires{" "}
                {new Date(invitation.expires_at).toLocaleDateString(locale)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No staff invitations yet.</p>
        )}
      </section>
    </>
  );
}
