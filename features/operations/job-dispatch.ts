import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnvironment } from "@/lib/env/server";

const MAX_SIGNATURE_AGE_SECONDS = 300;

function bodyHash(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

export function signJobDispatch(
  body: string,
  secret: string,
  timestamp: number,
) {
  if (secret.length < 20 || !Number.isSafeInteger(timestamp) || timestamp < 1) {
    throw new RangeError("Invalid dispatch signing input.");
  }
  return createHmac("sha256", secret)
    .update(`${timestamp}.${bodyHash(body)}`)
    .digest("hex");
}

export function verifyJobDispatch({
  body,
  secret,
  timestamp,
  signature,
  now = Math.floor(Date.now() / 1000),
}: {
  body: string;
  secret: string;
  timestamp: string | null;
  signature: string | null;
  now?: number;
}) {
  const parsedTimestamp = Number(timestamp);
  if (
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    !Number.isSafeInteger(parsedTimestamp) ||
    Math.abs(now - parsedTimestamp) > MAX_SIGNATURE_AGE_SECONDS
  ) {
    return false;
  }
  const expected = signJobDispatch(body, secret, parsedTimestamp);
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

export async function dispatchMediaWorker() {
  const environment = getServerEnvironment();
  if (!environment.SITE_URL || !environment.INTERNAL_JOB_SECRET) return false;
  const body = JSON.stringify({ kind: "media-work" });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signJobDispatch(
    body,
    environment.INTERNAL_JOB_SECRET,
    timestamp,
  );
  const response = await fetch(
    new URL("/.netlify/functions/media-worker", environment.SITE_URL),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-epoca-timestamp": String(timestamp),
        "x-epoca-signature": signature,
      },
      body,
      signal: AbortSignal.timeout(5_000),
    },
  );
  return response.ok;
}
