import {
  signOutAllSessionsAction,
  signOutAction,
  signOutOtherSessionsAction,
} from "@/features/auth/actions";
import type { StaffActorContext } from "@/features/auth/context";
import type { AppLocale } from "@/i18n/routing";

export function SessionMenu({
  locale,
  context,
  sessions,
}: {
  locale: AppLocale;
  context: StaffActorContext;
  sessions: Array<{
    auth_session_id: string;
    device_label: string | null;
    assurance_level: string;
    last_seen_at: string;
    revoked_at: string | null;
  }>;
}) {
  const active = sessions.filter((session) => !session.revoked_at);
  return (
    <details className="session-menu">
      <summary>
        {context.role} · {context.assuranceLevel.toUpperCase()}
      </summary>
      <div className="session-menu-panel">
        <p>
          <strong>{active.length}</strong> active{" "}
          {active.length === 1 ? "session" : "sessions"}
        </p>
        <ul className="plain-list">
          {active.slice(0, 3).map((session) => (
            <li key={session.auth_session_id}>
              {session.device_label ?? "Browser"} · {session.assurance_level} ·{" "}
              {new Date(session.last_seen_at).toLocaleString(locale)}
            </li>
          ))}
        </ul>
        {active.length > 1 ? (
          <>
            <form action={signOutOtherSessionsAction}>
              <input type="hidden" name="locale" value={locale} />
              <button className="text-button" type="submit">
                Sign out other sessions
              </button>
            </form>
            <form action={signOutAllSessionsAction}>
              <input type="hidden" name="locale" value={locale} />
              <button className="text-button" type="submit">
                Sign out every session
              </button>
            </form>
          </>
        ) : null}
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button className="text-button" type="submit">
            Sign out this session
          </button>
        </form>
      </div>
    </details>
  );
}
