import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnvironment } from "@/lib/env/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function signatureMatches(input: {
  body: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
}) {
  const seconds = Number(input.timestamp);
  if (
    !Number.isFinite(seconds) ||
    Math.abs(Date.now() / 1000 - seconds) > 300
  ) {
    return false;
  }
  const secretValue = input.secret.startsWith("whsec_")
    ? input.secret.slice(6)
    : input.secret;
  let key: Buffer;
  try {
    key = Buffer.from(secretValue, "base64");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", key)
    .update(`${input.id}.${input.timestamp}.${input.body}`)
    .digest();
  return input.signature.split(" ").some((part) => {
    const encoded = part.startsWith("v1,") ? part.slice(3) : "";
    if (!encoded) return false;
    let supplied: Buffer;
    try {
      supplied = Buffer.from(encoded, "base64");
    } catch {
      return false;
    }
    return (
      supplied.length === expected.length && timingSafeEqual(supplied, expected)
    );
  });
}

export async function acceptResendWebhook(input: {
  body: string;
  id: string;
  timestamp: string;
  signature: string;
}) {
  const environment = getServerEnvironment();
  if (
    !environment.RESEND_WEBHOOK_SECRET ||
    !signatureMatches({ ...input, secret: environment.RESEND_WEBHOOK_SECRET })
  ) {
    throw new Error("INVALID_RESEND_SIGNATURE");
  }
  const parsed = JSON.parse(input.body) as unknown;
  if (!parsed || typeof parsed !== "object")
    throw new Error("INVALID_RESEND_EVENT");
  const event = parsed as Record<string, unknown>;
  const data = event.data;
  const providerReference =
    data && typeof data === "object" && "email_id" in data
      ? String(data.email_id)
      : "";
  const eventType = typeof event.type === "string" ? event.type : "";
  const outcome =
    eventType === "email.delivered"
      ? "delivered"
      : eventType === "email.bounced"
        ? "bounced"
        : undefined;
  if (!providerReference || !outcome) return { ignored: true as const };
  const client = createServiceSupabaseClient();
  const { error } = await client.rpc("record_notification_delivery", {
    p_provider: "resend",
    p_event_key: input.id,
    p_payload_hash: createHash("sha256").update(input.body).digest("hex"),
    p_provider_reference: providerReference,
    p_outcome: outcome,
  });
  if (error) throw error;
  return { ignored: false as const };
}
