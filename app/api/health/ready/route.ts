import { requireOwnerAssurance } from "@/features/auth/authorization";
import { resolveActorContext } from "@/features/auth/context";
import { getCurrentAuthSessionId } from "@/features/auth/session";
import {
  collectOperationalHealth,
  publicHealthResponse,
} from "@/features/operations/health";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function mayReadDiagnostics() {
  try {
    const client = await createServerSupabaseClient();
    const context = await resolveActorContext(
      client,
      await getCurrentAuthSessionId(client),
    );
    requireOwnerAssurance(context);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const health = await collectOperationalHealth();
  const requestedDetails =
    new URL(request.url).searchParams.get("details") === "1";
  const body =
    requestedDetails && (await mayReadDiagnostics())
      ? health
      : publicHealthResponse(health);
  return Response.json(body, {
    status: health.readiness === "down" ? 503 : 200,
    headers: { "cache-control": "no-store" },
  });
}
