import {
  currentEnvironment,
  currentRelease,
} from "@/features/operations/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "ok",
      release: currentRelease(),
      environment: currentEnvironment(),
      timestamp: new Date().toISOString(),
    },
    {
      headers: { "cache-control": "no-store" },
    },
  );
}
