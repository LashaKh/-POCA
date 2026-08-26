import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function runSecurityMaintenance() {
  const client = createServiceSupabaseClient();
  const expired = await client
    .from("export_jobs")
    .select("object_path")
    .not("object_path", "is", null)
    .lte("expires_at", new Date().toISOString())
    .limit(100);
  if (expired.error) throw expired.error;
  const paths = expired.data.flatMap((row) =>
    row.object_path ? [row.object_path] : [],
  );
  if (paths.length) {
    const removal = await client.storage.from("catalog-exports").remove(paths);
    if (removal.error) throw removal.error;
  }
  const result = await client.rpc("run_security_maintenance");
  if (result.error) throw result.error;
  return { maintenance: result.data, removedExportObjects: paths.length };
}
