import { processIngestionWork } from "../../features/media/worker";
import { verifyJobDispatch } from "../../features/operations/job-dispatch";
import { getServerEnvironment } from "../../lib/env/server";

export default async function mediaWorker(request: Request) {
  const body = await request.text();
  const environment = getServerEnvironment();
  if (
    !environment.INTERNAL_JOB_SECRET ||
    !verifyJobDispatch({
      body,
      secret: environment.INTERNAL_JOB_SECRET,
      timestamp: request.headers.get("x-epoca-timestamp"),
      signature: request.headers.get("x-epoca-signature"),
    })
  ) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const result = await processIngestionWork();
  return new Response(JSON.stringify({ ok: true, ...result }), {
    headers: { "content-type": "application/json" },
  });
}
