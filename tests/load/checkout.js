import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const concurrency = Number(process.env.CHECKOUT_LOAD_CONCURRENCY ?? 50);
const p95BudgetMs = Number(process.env.CHECKOUT_LOAD_P95_MS ?? 1000);

if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
  throw new Error(
    "CHECKOUT_LOAD_CONCURRENCY must be an integer from 1 through 100.",
  );
}

const status = execFileSync(
  resolve(process.cwd(), "node_modules/.bin/supabase"),
  ["status", "-o", "env"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
);
const local = Object.fromEntries(
  status
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), JSON.parse(line.slice(separator + 1))];
    }),
);
const service = () =>
  createClient(local.API_URL, local.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const admin = service();
const { data: inventory, error: inventoryError } = await admin
  .from("inventory_items")
  .select("product_id,products!inner(sku,delivery_class)")
  .gt("available_quantity", 0)
  .eq("products.delivery_class", "parcel")
  .order("product_id")
  .limit(concurrency);
if (inventoryError) throw inventoryError;
if (!inventory || inventory.length < concurrency) {
  throw new Error(
    `Only ${inventory?.length ?? 0} eligible products are available.`,
  );
}

const prepared = await Promise.all(
  inventory.map(async ({ product_id: productId }) => {
    const client = service();
    const secretHash = crypto.randomUUID().replaceAll("-", "").repeat(2);
    const context = await client.rpc("create_guest_context", {
      p_secret_hash: secretHash,
      p_locale: "en",
      p_currency: "GEL",
    });
    if (context.error)
      return { client, secretHash, error: context.error.message };
    const added = await client.rpc("add_guest_cart_item", {
      p_secret_hash: secretHash,
      p_product_id: productId,
      p_quantity: 1,
    });
    if (added.error) return { client, secretHash, error: added.error.message };
    return { client, secretHash };
  }),
);

const preparationErrors = prepared.filter((outcome) => "error" in outcome);
if (preparationErrors.length) {
  console.log(JSON.stringify({ concurrency, preparationErrors }, null, 2));
  process.exit(1);
}

const durations = [];
const checkoutIds = [];
const outcomes = await Promise.all(
  prepared.map(async ({ client, secretHash }) => {
    const start = performance.now();
    const reserved = await client.rpc("reserve_guest_checkout", {
      p_secret_hash: secretHash,
      p_country_code: "GE",
      p_method_code: "standard-test",
    });
    durations.push(performance.now() - start);
    if (reserved.error) return { error: reserved.error.message };
    checkoutIds.push(reserved.data.id);
    return { totalMinor: reserved.data.id ? 1 : 0 };
  }),
);

await Promise.all(
  checkoutIds.map((checkoutId) =>
    admin.rpc("release_checkout_session", {
      p_checkout_session_id: checkoutId,
      p_reason: "load-test-cleanup",
      p_expired: false,
    }),
  ),
);

const errors = outcomes.filter((outcome) => "error" in outcome);
const sorted = [...durations].sort((left, right) => left - right);
const percentile = (fraction) =>
  sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
const report = {
  concurrency,
  successes: outcomes.length - errors.length,
  errors: errors.map((outcome) => outcome.error),
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  maxMs: Math.round(sorted.at(-1) ?? 0),
};
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0 || report.p95Ms > p95BudgetMs) process.exitCode = 1;
