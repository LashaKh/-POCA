import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const rootBudgetBytes = Number(process.env.ROOT_JS_GZIP_BUDGET_BYTES ?? 174080);
const databaseP95BudgetMs = Number(process.env.DATABASE_SEARCH_P95_MS ?? 250);
const queueAgeBudgetSeconds = Number(
  process.env.QUEUE_AGE_BUDGET_SECONDS ?? 900,
);
const manifest = JSON.parse(
  await readFile(".next/build-manifest.json", "utf8"),
);
const rootBytes = (
  await Promise.all(
    manifest.rootMainFiles.map(
      async (file) =>
        gzipSync(await readFile(`.next/${file}`), { level: 9 }).byteLength,
    ),
  )
).reduce((total, size) => total + size, 0);

const imageSource = await readFile(
  "components/storefront/responsive-product-image.tsx",
  "utf8",
);
const responsiveImages =
  imageSource.includes("next/image") && imageSource.includes("sizes={sizes}");

const output = execFileSync(
  "node_modules/.bin/supabase",
  ["status", "-o", "env"],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  },
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
const publicClient = createClient(local.API_URL, local.ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const serviceClient = createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const durations = [];
for (let attempt = 0; attempt < 20; attempt += 1) {
  const started = performance.now();
  const result = await publicClient.rpc("search_catalog", {
    p_locale: "en",
    p_query: `SYN-${String(4980 + (attempt % 10)).padStart(5, "0")}`,
    p_currency: "GEL",
    p_limit: 24,
    p_offset: 0,
    p_materials: [],
    p_colors: [],
    p_in_stock: true,
    p_sort: "relevance",
  });
  if (result.error) throw result.error;
  durations.push(performance.now() - started);
}
durations.sort((left, right) => left - right);
const databaseP95Ms = durations[Math.ceil(durations.length * 0.95) - 1];
const oldestQueue = await serviceClient
  .from("scheduled_actions")
  .select("due_at")
  .in("status", ["pending", "failed"])
  .lte("due_at", new Date().toISOString())
  .order("due_at")
  .limit(1)
  .maybeSingle();
if (oldestQueue.error) throw oldestQueue.error;
const queueAgeSeconds = oldestQueue.data
  ? Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(oldestQueue.data.due_at).getTime()) / 1000,
      ),
    )
  : 0;

const report = {
  rootJavaScriptGzipBytes: rootBytes,
  rootJavaScriptBudgetBytes: rootBudgetBytes,
  responsiveImages,
  databaseSearchP95Ms: Math.round(databaseP95Ms),
  databaseSearchBudgetMs: databaseP95BudgetMs,
  queueAgeSeconds,
  queueAgeBudgetSeconds,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (
  rootBytes > rootBudgetBytes ||
  !responsiveImages ||
  databaseP95Ms > databaseP95BudgetMs ||
  queueAgeSeconds > queueAgeBudgetSeconds
) {
  process.exitCode = 1;
}
