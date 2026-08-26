import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnvironment } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

type AssuranceLevel = "aal1" | "aal2";
type SessionState = "active" | "expired" | "revoked";

export type AnonymousActorContext = {
  kind: "anonymous";
};

export type GuestActorContext = {
  kind: "guest";
  guestId: string;
};

export type CustomerActorContext = {
  kind: "customer";
  profileId: string;
  assuranceLevel: AssuranceLevel;
  sessionState: SessionState;
};

export type StaffActorContext = {
  kind: "staff";
  profileId: string;
  email?: string;
  assuranceLevel: AssuranceLevel;
  sessionState: SessionState;
  role: "owner" | "manager";
  active: boolean;
};

export type ActorContext =
  | AnonymousActorContext
  | GuestActorContext
  | CustomerActorContext
  | StaffActorContext;

export function isSafeReturnPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return false;
  }

  try {
    const url = new URL(path, "https://epoca.invalid");
    return (
      url.origin === "https://epoca.invalid" && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

export async function resolveActorContext(
  client: SupabaseClient<Database>,
  authSessionId: string | undefined,
): Promise<ActorContext> {
  const { data: claimsData, error: claimsError } =
    await client.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return { kind: "anonymous" };
  }

  const profileId = claimsData.claims.sub;
  const assuranceLevel = claimsData.claims.aal === "aal2" ? "aal2" : "aal1";
  let sessionState: SessionState = "active";

  if (authSessionId) {
    const { data: session, error: sessionError } = await client
      .from("app_sessions")
      .select("revoked_at,expires_at")
      .eq("auth_session_id", authSessionId)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (session?.revoked_at) {
      sessionState = "revoked";
    } else if (
      session &&
      new Date(session.expires_at).getTime() <= Date.now()
    ) {
      sessionState = "expired";
    }
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("profile_kind")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (profile?.profile_kind !== "staff") {
    return { kind: "customer", profileId, assuranceLevel, sessionState };
  }

  const { data: staff, error: staffError } = await client
    .from("staff_members")
    .select("role,active")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  if (!staff) {
    return { kind: "customer", profileId, assuranceLevel, sessionState };
  }

  return {
    kind: "staff",
    profileId,
    email:
      typeof claimsData.claims.email === "string"
        ? claimsData.claims.email
        : undefined,
    assuranceLevel,
    sessionState,
    role: staff.role,
    active: staff.active,
  };
}

export async function refreshRequestAuth(request: NextRequest) {
  const env = getPublicEnvironment();
  let response = NextResponse.next({ request });

  const client = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await client.auth.getClaims();
  const sessionId =
    typeof data?.claims?.session_id === "string"
      ? data.claims.session_id
      : undefined;
  const context = await resolveActorContext(client, sessionId);

  return { context, response };
}
