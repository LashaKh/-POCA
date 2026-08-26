import { managerCommandClient } from "@/features/auth/admin-command";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  let client: Awaited<ReturnType<typeof managerCommandClient>>;
  try {
    client = await managerCommandClient("catalog.import-errors.download");
  } catch {
    return new Response(null, { status: 403 });
  }
  const batch = await client
    .from("catalog_import_batches")
    .select("original_filename,error_report_path")
    .eq("id", batchId)
    .maybeSingle();
  if (batch.error || !batch.data?.error_report_path) {
    return new Response(null, { status: 404 });
  }
  const download = await client.storage
    .from("catalog-imports")
    .download(batch.data.error_report_path);
  if (download.error) return new Response(null, { status: 404 });
  const safeName = batch.data.original_filename.replaceAll(
    /[^A-Za-z0-9._-]/g,
    "-",
  );
  return new Response(download.data, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName}-errors.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
