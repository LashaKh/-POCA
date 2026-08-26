import {
  signOutAction,
  signOutAllSessionsAction,
  signOutOtherSessionsAction,
} from "@/features/auth/actions";
import { revokeCustomerSessionAction } from "@/features/customer/actions";
import type { AppLocale } from "@/i18n/routing";

export function CustomerSessionManager({
  locale,
  sessions,
  labels,
}: {
  locale: AppLocale;
  sessions: Array<{
    auth_session_id: string;
    device_label: string | null;
    assurance_level: string;
    last_seen_at: string;
    expires_at: string;
    revoked_at: string | null;
  }>;
  labels: Record<string, string>;
}) {
  const active = sessions;
  return (
    <section className="account-panel" aria-labelledby="sessions-heading">
      <h2 id="sessions-heading">{labels.title}</h2>
      {active.length ? (
        <ul className="plain-list">
          {active.map((session) => (
            <li key={session.auth_session_id}>
              <span>
                {session.device_label ?? labels.browser} ·{" "}
                {session.assurance_level.toUpperCase()} ·{" "}
                {new Date(session.last_seen_at).toLocaleString(locale)}
              </span>
              <form action={revokeCustomerSessionAction}>
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="authSessionId"
                  value={session.auth_session_id}
                />
                <button className="text-button" type="submit">
                  {labels.revoke}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p>{labels.empty}</p>
      )}
      <div className="button-row">
        <form action={signOutOtherSessionsAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value="/account/settings" />
          <button className="text-button" type="submit">
            {labels.other}
          </button>
        </form>
        <form action={signOutAllSessionsAction}>
          <input type="hidden" name="locale" value={locale} />
          <button className="text-button" type="submit">
            {labels.all}
          </button>
        </form>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button className="text-button" type="submit">
            {labels.current}
          </button>
        </form>
      </div>
    </section>
  );
}
