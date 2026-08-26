import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";

function networkPrefix(value: string | null) {
  const address = value?.split(",")[0]?.trim();
  if (!address) return undefined;
  if (address.includes(".")) {
    const parts = address.split(".");
    return parts.length === 4
      ? `${parts.slice(0, 3).join(".")}.0/24`
      : undefined;
  }
  if (address.includes(":")) {
    return `${address.split(":").slice(0, 4).join(":")}::/64`;
  }
  return undefined;
}

function deviceLabel(userAgent: string) {
  const browser = userAgent.includes("Firefox/")
    ? "Firefox"
    : userAgent.includes("Edg/")
      ? "Edge"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Browser";
  const platform = userAgent.includes("iPhone")
    ? "iPhone"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("Macintosh")
        ? "Mac"
        : userAgent.includes("Windows")
          ? "Windows"
          : userAgent.includes("Linux")
            ? "Linux"
            : "device";
  return `${browser} on ${platform}`;
}

export async function registerCurrentSession(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims) throw error ?? new Error("AUTH_CLAIMS_MISSING");
  const sessionId = data.claims.session_id;
  const expiresAt = data.claims.exp;
  if (typeof sessionId !== "string" || typeof expiresAt !== "number") {
    throw new Error("AUTH_SESSION_CLAIMS_INVALID");
  }
  const requestHeaders = await headers();
  const userAgent = (requestHeaders.get("user-agent") ?? "Unknown browser")
    .replaceAll(/[\r\n]/g, " ")
    .slice(0, 240);
  const prefix = networkPrefix(
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"),
  );
  const result = await client.rpc("record_current_session", {
    p_auth_session_id: sessionId,
    p_assurance_level: data.claims.aal === "aal2" ? "aal2" : "aal1",
    p_user_agent_summary: userAgent,
    p_ip_prefix_hash: createHash("sha256")
      .update(prefix ?? "network-prefix-unavailable")
      .digest("hex"),
    p_expires_at: new Date(expiresAt * 1000).toISOString(),
    p_device_label: deviceLabel(userAgent),
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function getCurrentAuthSessionId(
  client: SupabaseClient<Database>,
) {
  const { data } = await client.auth.getClaims();
  return typeof data?.claims?.session_id === "string"
    ? data.claims.session_id
    : undefined;
}
