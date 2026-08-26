import { execFileSync } from "node:child_process";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const output = execFileSync(
  "node_modules/.bin/supabase",
  ["status", "-o", "env"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
);
const local = Object.fromEntries(
  output
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), JSON.parse(line.slice(separator + 1))];
    }),
);
const client = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const [products, release, readiness] = await Promise.all([
  client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "published"),
  client
    .from("release_records")
    .select("environment,status")
    .eq("release_id", "local-seed-candidate")
    .maybeSingle(),
  client
    .from("readiness_assessments")
    .select("decision,blockers")
    .eq("id", "00000000-0000-4000-8000-000000000703")
    .maybeSingle(),
]);
const errors = [products.error, release.error, readiness.error].filter(Boolean);
const valid =
  errors.length === 0 &&
  (products.count ?? 0) >= 3 &&
  release.data?.environment === "local" &&
  release.data.status === "candidate" &&
  readiness.data?.decision === "hold" &&
  readiness.data.blockers.includes("LOCAL_FIXTURE_ONLY");

if (!valid) {
  process.stderr.write("Safe local seed verification failed.\n");
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Safe local seed verified with ${products.count} published catalog fixtures and an explicit hold decision.\n`,
  );
}
