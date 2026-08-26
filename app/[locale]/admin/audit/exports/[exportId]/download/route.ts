import { requireOwnerAssurance } from "@/features/auth/authorization";
import { resolveActorContext } from "@/features/auth/context";
import { getCurrentAuthSessionId } from "@/features/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exportId: string }> },
) {
  const { exportId } = await params;
  const client = await createServerSupabaseClient();
  try {
    requireOwnerAssurance(
      await resolveActorContext(client, await getCurrentAuthSessionId(client)),
    );
  } catch {
    return new Response(null, { status: 403 });
  }
  const job = await client
    .from("export_jobs")
    .select("status,object_path,download_name,expires_at")
    .eq("id", exportId)
    .eq("export_type", "audit")
    .maybeSingle();
  if (
    job.error ||
    !job.data?.object_path ||
    job.data.status !== "complete" ||
    !job.data.expires_at ||
    new Date(job.data.expires_at).getTime() <= Date.now()
  )
    return new Response(null, { status: 404 });
  const download = await client.storage
    .from("catalog-exports")
    .download(job.data.object_path);
  if (download.error) return new Response(null, { status: 404 });
  const safeName = (job.data.download_name ?? "epoca-audit.csv").replaceAll(
    /[^A-Za-z0-9._-]/g,
    "-",
  );
  return new Response(download.data, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName}"`,
      "cache-control": "private, no-store",
    },
  });
}
