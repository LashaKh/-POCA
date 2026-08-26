import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function listedFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);
}

function filesUnder(directory) {
  try {
    return readdirSync(directory).flatMap((name) => {
      const target = resolve(directory, name);
      return statSync(target).isDirectory() ? filesUnder(target) : [target];
    });
  } catch {
    return [];
  }
}

function text(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

const repositoryFiles = listedFiles();
const generatedPrefixes = [
  "artifacts/",
  "test-results/",
  "playwright-report/",
  ".netlify/",
  ".next/",
  "coverage/",
];
for (const file of repositoryFiles) {
  if (generatedPrefixes.some((prefix) => file.startsWith(prefix))) {
    fail(`generated or expired preview artifact is tracked: ${file}`);
  }
}

const readableExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const secretPatterns = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{20,}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "service-role JWT",
    /(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["']?eyJ[A-Za-z0-9_-]{40,}/,
  ],
  [
    "credential-bearing URL",
    /(?:postgres|postgresql):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/,
  ],
];
for (const file of repositoryFiles) {
  if (!readableExtensions.has(extname(file)) && file !== ".env.example")
    continue;
  const value = text(resolve(root, file));
  if (value === undefined) continue;
  const normalized = value.replaceAll("sb_secret_local_test_service_key", "");
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(normalized)) fail(`${label} pattern found in ${file}`);
  }
}

const runtimeRoots = [
  "app",
  "components",
  "features",
  "lib",
  "messages",
  "netlify",
].flatMap((directory) => filesUnder(resolve(root, directory)));
for (const file of [
  ...runtimeRoots,
  resolve(root, "proxy.ts"),
  resolve(root, "instrumentation.ts"),
  resolve(root, "next.config.ts"),
]) {
  const value = text(file);
  if (value === undefined) continue;
  const name = relative(root, file);
  if (/\b(?:TODO|FIXME|HACK)\b/.test(value)) {
    fail(`unresolved launch marker in ${name}`);
  }
  if (
    /\bconsole\.(?:log|debug)\s*\(/.test(value) ||
    /\bdebugger\s*;/.test(value)
  ) {
    fail(`debug output in runtime source: ${name}`);
  }
  if (/@epoca\.test\b|\.example\.invalid\b/.test(value)) {
    fail(`unsafe fixture fact in runtime source: ${name}`);
  }
}

const homeSource = text(resolve(root, "app/[locale]/(store)/page.tsx")) ?? "";
if (
  !homeSource.includes('process.env.DEPLOY_ENV === "local"') ||
  !homeSource.includes('t("syntheticNotice")')
) {
  fail(
    "the synthetic catalog disclosure is not restricted to the local environment",
  );
}
const headerSource =
  text(resolve(root, "components/storefront/site-header.tsx")) ?? "";
if (headerSource.includes("/collections/synthetic-collection")) {
  fail("production navigation still contains the synthetic seed collection");
}
const environmentSource = text(resolve(root, "lib/env/schema.ts")) ?? "";
if (
  !environmentSource.includes(
    "production cannot start with a fixture or sandbox provider mode",
  )
) {
  fail("production does not explicitly reject fixture/sandbox provider modes");
}

const approvedPublicAssets = new Set([
  "README.md",
  "_headers",
  "_redirects",
  "catalog-import-template.csv",
  "maintenance.html",
  "offline.html",
]);
for (const file of filesUnder(resolve(root, "public"))) {
  const name = relative(resolve(root, "public"), file);
  if (!approvedPublicAssets.has(name))
    fail(`unreviewed public asset: public/${name}`);
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`FAIL  ${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    [
      "PASS  No credential material or credential-bearing URLs.",
      "PASS  No runtime TODO/FIXME/HACK, console.log/debug, or debugger output.",
      "PASS  Local fixture disclosure is gated and production rejects fixture providers.",
      "PASS  No tracked build/test/preview artifacts or unreviewed public assets.",
    ].join("\n") + "\n",
  );
}
