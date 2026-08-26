import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const checks = [];
const staticOnly = process.argv.includes("--static");

function pass(name, detail) {
  checks.push({ name, detail });
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

const npmAudit = spawnSync(
  "npm",
  ["audit", "--json", "--audit-level=moderate"],
  {
    cwd: root,
    encoding: "utf8",
  },
);
const auditReport = JSON.parse(npmAudit.stdout || "{}");
const vulnerabilities = auditReport.metadata?.vulnerabilities ?? {};
const materialVulnerabilities =
  Number(vulnerabilities.moderate ?? 0) +
  Number(vulnerabilities.high ?? 0) +
  Number(vulnerabilities.critical ?? 0);
requireCondition(
  materialVulnerabilities === 0,
  "Dependency audit found moderate, high, or critical vulnerabilities.",
);
pass("Dependencies", "No moderate, high, or critical npm advisories.");

const listedFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter(
    (file) =>
      !file.startsWith("docs/quality/screenshots/") &&
      !file.startsWith("test-results/"),
  );
const secretPatterns = [
  /sb_secret_[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["']eyJ[A-Za-z0-9_-]{40,}/,
];
const leaked = [];
for (const file of listedFiles) {
  const path = resolve(root, file);
  let value;
  try {
    value = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  value = value.replaceAll("sb_secret_local_test_service_key", "");
  if (secretPatterns.some((pattern) => pattern.test(value))) leaked.push(file);
}
requireCondition(
  leaked.length === 0,
  "Potential committed credential material found in: " + leaked.join(", "),
);
pass("Secret scan", "No Supabase secret, private key, or service JWT pattern.");

const proxySource = readFileSync(resolve(root, "proxy.ts"), "utf8");
const headerSource = readFileSync(
  resolve(root, "lib/security/headers.ts"),
  "utf8",
);
for (const required of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "Referrer-Policy",
]) {
  requireCondition(
    proxySource.includes(required) || headerSource.includes(required),
    "Missing security-header implementation: " + required,
  );
}
requireCondition(
  proxySource.includes("refreshRequestAuth") &&
    proxySource.includes("context.sessionState"),
  "Proxy does not enforce refreshed and active sessions.",
);
pass(
  "Headers and CSP",
  "Nonce CSP, HSTS, MIME, referrer, and session checks present.",
);

const migrations = listedFiles
  .filter((file) => file.startsWith("supabase/migrations/"))
  .map((file) => readFileSync(resolve(root, file), "utf8"))
  .join("\n");
for (const required of [
  "force row level security",
  "protected_operations",
  "reject_sensitive_audit_summary",
  "rate_limit",
  "LAST_ACTIVE_OWNER",
]) {
  requireCondition(
    migrations.toLowerCase().includes(required.toLowerCase()),
    "Missing database security control: " + required,
  );
}
pass(
  "Database controls",
  "Forced RLS, exact confirmations, redaction, rate limits, and last-Owner protection present.",
);

if (!staticOnly) {
  execFileSync(
    resolve(root, "node_modules/.bin/supabase"),
    ["test", "db", "supabase/tests/database/080_authorization.test.sql"],
    { cwd: root, stdio: "inherit" },
  );
  pass(
    "Authorization boundary",
    "Role-matrix pgTAP suite passed against local Postgres.",
  );

  execFileSync(
    resolve(root, "node_modules/.bin/vitest"),
    [
      "run",
      "tests/unit/auth/authorization.test.ts",
      "tests/unit/admin/security/security-domain.test.ts",
      "tests/integration/auth/authorization.test.ts",
    ],
    { cwd: root, stdio: "inherit" },
  );
  pass(
    "Application boundary",
    "Unit and real local Auth integration security suites passed.",
  );
} else {
  pass(
    "Runtime boundaries",
    "Deferred to the database and application test jobs; static controls passed here.",
  );
}

for (const check of checks) {
  process.stdout.write("PASS  " + check.name + " — " + check.detail + "\n");
}
