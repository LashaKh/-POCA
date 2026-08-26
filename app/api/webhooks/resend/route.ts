import { acceptResendWebhook } from "@/features/operations/resend-webhook";
import { getServerEnvironment } from "@/lib/env/server";
import {
  consumePolicyRateLimit,
  hashRateLimitSubject,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 262_144) return new Response(null, { status: 413 });
  const source =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown-source";
  const environment = getServerEnvironment();
  const decision = await consumePolicyRateLimit({
    policy: "emailProviderEvent",
    subjectHash: hashRateLimitSubject(
      "email-provider-event",
      source,
      environment.SUPABASE_SERVICE_ROLE_KEY,
    ),
  });
  if (!decision.allowed) return rateLimitResponse(decision);
  const body = await request.text();
  try {
    await acceptResendWebhook({
      body,
      id: request.headers.get("svix-id") ?? "",
      timestamp: request.headers.get("svix-timestamp") ?? "",
      signature: request.headers.get("svix-signature") ?? "",
    });
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
