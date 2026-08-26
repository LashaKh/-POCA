import { acceptTbcCallback } from "@/features/payments/webhook-service";
import { getServerEnvironment } from "@/lib/env/server";
import {
  consumePolicyRateLimit,
  hashRateLimitSubject,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function sourceIp(request: Request) {
  const value =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return value?.replace(/^::ffff:/, "");
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 4_096) return new Response(null, { status: 413 });
  const environment = getServerEnvironment();
  const decision = await consumePolicyRateLimit({
    policy: "paymentEvent",
    subjectHash: hashRateLimitSubject(
      "payment-event",
      sourceIp(request) ?? "unknown-source",
      environment.SUPABASE_SERVICE_ROLE_KEY,
    ),
  });
  if (!decision.allowed) return rateLimitResponse(decision);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    await acceptTbcCallback({ body, sourceIp: sourceIp(request) });
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
