import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string", default: "owner@epoca.local" },
    help: { type: "boolean", short: "h", default: false },
    name: { type: "string" },
    role: { type: "string", default: "owner" },
  },
});

if (values.help) {
  process.stdout.write(
    [
      "Create a local-only ÉPOCA staff login.",
      "",
      "Usage:",
      "  npm run staff:local -- --role owner --email owner@epoca.local",
      "  npm run staff:local -- --role manager --email manager@epoca.local",
      "",
      "A random password is printed once. This command refuses non-local Supabase URLs.",
    ].join("\n") + "\n",
  );
  process.exit(0);
}

if (values.role !== "owner" && values.role !== "manager") {
  throw new Error("Role must be owner or manager.");
}
if (!values.email?.endsWith(".local")) {
  throw new Error("Local staff email must use the reserved .local suffix.");
}

const status = execFileSync(
  resolve(process.cwd(), "node_modules/.bin/supabase"),
  ["status", "-o", "env"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
const environment = Object.fromEntries(
  status
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), JSON.parse(line.slice(separator + 1))];
    }),
);
const apiUrl = new URL(environment.API_URL ?? "");
if (apiUrl.hostname !== "127.0.0.1" && apiUrl.hostname !== "localhost") {
  throw new Error("Refusing to create staff outside local Supabase.");
}
if (!environment.SERVICE_ROLE_KEY) {
  throw new Error("Local Supabase did not report SERVICE_ROLE_KEY.");
}

const { createClient } = await import("@supabase/supabase-js");
const client = createClient(apiUrl.toString(), environment.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `${values.role === "owner" ? "Owner" : "Manager"}-Local-${randomUUID()}!`;
const created = await client.auth.admin.createUser({
  email: values.email,
  password,
  email_confirm: true,
});
if (created.error) throw created.error;
const userId = created.data.user.id;

try {
  const profile = await client.from("profiles").insert({
    id: userId,
    profile_kind: "staff",
    display_name:
      values.name ??
      (values.role === "owner" ? "Local Owner" : "Local Manager"),
    locale: "en",
  });
  if (profile.error) throw profile.error;
  const staff = await client.from("staff_members").insert({
    profile_id: userId,
    role: values.role,
    active: true,
    mfa_required: values.role === "owner",
    activated_at: new Date().toISOString(),
  });
  if (staff.error) throw staff.error;
} catch (error) {
  await client.auth.admin.deleteUser(userId);
  throw error;
}

process.stdout.write(
  [
    "Local staff account created.",
    `Role: ${values.role}`,
    `Email: ${values.email}`,
    `Password (shown once): ${password}`,
    "Sign in at: http://127.0.0.1:3000/en/admin",
    values.role === "owner"
      ? "Local Owner MFA is bypassed; hosted Owner access still requires MFA."
      : "Manager access is ready after sign-in.",
  ].join("\n") + "\n",
);
