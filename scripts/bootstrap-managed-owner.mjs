import { randomUUID } from "node:crypto";
import process from "node:process";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    confirm: { type: "string" },
    email: { type: "string" },
    help: { type: "boolean", short: "h", default: false },
    name: { type: "string", default: "ÉPOCA Owner" },
    "project-ref": { type: "string" },
    resume: { type: "string" },
  },
});

if (values.help) {
  process.stdout.write(
    [
      "Bootstrap the first Owner in a managed ÉPOCA Supabase project.",
      "",
      "Required environment:",
      "  EPOCA_SUPABASE_URL",
      "  EPOCA_SUPABASE_SERVICE_ROLE_KEY",
      "  EPOCA_OWNER_PASSWORD",
      "",
      "Usage:",
      "  npm run staff:bootstrap-managed -- --project-ref <ref> --confirm <ref> --email owner@example.com",
      "  npm run staff:bootstrap-managed -- --project-ref <ref> --confirm <ref> --resume <ref> --email owner@example.com",
      "",
      "The command refuses local projects, mismatched confirmations, existing Auth users,",
      "and projects that already have staff. It never prints the password or service key.",
    ].join("\n") + "\n",
  );
  process.exit(0);
}

const projectRef = values["project-ref"]?.trim();
const email = values.email?.trim().toLowerCase();
const displayName = values.name?.trim();
const apiUrl = new URL(process.env.EPOCA_SUPABASE_URL ?? "");
const serviceRoleKey = process.env.EPOCA_SUPABASE_SERVICE_ROLE_KEY?.trim();
const password = process.env.EPOCA_OWNER_PASSWORD ?? "";

if (!projectRef?.match(/^[a-z0-9]{20}$/)) {
  throw new Error("A valid 20-character Supabase project ref is required.");
}
if (values.confirm !== projectRef) {
  throw new Error("Confirmation must exactly match the target project ref.");
}
if (
  apiUrl.protocol !== "https:" ||
  apiUrl.hostname !== `${projectRef}.supabase.co`
) {
  throw new Error(
    "EPOCA_SUPABASE_URL must match the confirmed managed project.",
  );
}
if (!serviceRoleKey || serviceRoleKey.length < 40) {
  throw new Error("EPOCA_SUPABASE_SERVICE_ROLE_KEY is required.");
}
if (!email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || email.length > 254) {
  throw new Error("A valid Owner email is required.");
}
if (!displayName || displayName.length > 160) {
  throw new Error("Owner display name must contain 1–160 characters.");
}
if (
  password.length < 24 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/[0-9]/.test(password) ||
  !/[^A-Za-z0-9]/.test(password)
) {
  throw new Error(
    "EPOCA_OWNER_PASSWORD must be a strong one-time password of at least 24 characters.",
  );
}

const { createClient } = await import("@supabase/supabase-js");
const client = createClient(apiUrl.toString(), serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail() {
  for (let page = 1; ; page += 1) {
    const users = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (users.error) throw users.error;
    const matchingUser = users.data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (matchingUser) return matchingUser;
    if (users.data.users.length < 1000) return undefined;
  }
}

const staffRecords = await client
  .from("staff_members")
  .select("profile_id,role,active,mfa_required");
if (staffRecords.error) throw staffRecords.error;
if (staffRecords.data.length !== 0) {
  if (values.resume !== projectRef || staffRecords.data.length !== 1) {
    throw new Error(
      "Managed bootstrap is closed because this project already has staff.",
    );
  }
  const [staff] = staffRecords.data;
  const existingUser = await findAuthUserByEmail();
  if (
    !existingUser ||
    existingUser.id !== staff.profile_id ||
    staff.role !== "owner" ||
    !staff.active ||
    !staff.mfa_required
  ) {
    throw new Error(
      "Existing staff state does not match the guarded first-Owner recovery contract.",
    );
  }
  const updated = await client.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
  });
  if (updated.error) throw updated.error;
  const existingAudit = await client
    .from("audit_events")
    .select("id")
    .eq("action", "security.staff.bootstrap")
    .eq("entity_type", "staff")
    .eq("entity_id", existingUser.id)
    .maybeSingle();
  if (existingAudit.error) throw existingAudit.error;
  if (!existingAudit.data) {
    const audit = await client.from("audit_events").insert({
      actor_class: "service",
      action: "security.staff.bootstrap",
      entity_type: "staff",
      entity_id: existingUser.id,
      result: "succeeded",
      source: "managed-bootstrap",
      correlation_id: randomUUID(),
      summary: { role: "owner", recovered: true },
      retention_class: "security",
    });
    if (audit.error) throw audit.error;
  }
  process.stdout.write(
    [
      "Managed Owner bootstrap recovered.",
      `Project: ${projectRef}`,
      "Role: owner",
      "MFA: required on first administrative sign-in",
      "Password: replaced from the protected runtime and not displayed",
    ].join("\n") + "\n",
  );
  process.exit(0);
}

if (await findAuthUserByEmail()) {
  throw new Error(
    "An Auth user already uses the requested Owner email; refusing privilege escalation.",
  );
}

const created = await client.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    display_name: displayName,
    locale: "en",
    profile_kind: "staff",
  },
});
if (created.error || !created.data.user) {
  throw (
    created.error ?? new Error("Supabase did not return the created Owner.")
  );
}
const userId = created.data.user.id;
let staffCreated = false;

try {
  const profile = await client.from("profiles").insert({
    id: userId,
    profile_kind: "staff",
    display_name: displayName,
    locale: "en",
  });
  if (profile.error) throw profile.error;

  const staff = await client.from("staff_members").insert({
    profile_id: userId,
    role: "owner",
    active: true,
    mfa_required: true,
    activated_at: new Date().toISOString(),
  });
  if (staff.error) throw staff.error;
  staffCreated = true;

  const audit = await client.from("audit_events").insert({
    actor_class: "service",
    action: "security.staff.bootstrap",
    entity_type: "staff",
    entity_id: userId,
    result: "succeeded",
    source: "managed-bootstrap",
    correlation_id: randomUUID(),
    summary: { role: "owner" },
    retention_class: "security",
  });
  if (audit.error) throw audit.error;
} catch (error) {
  if (staffCreated) {
    throw new Error(
      "Owner identity exists but bootstrap evidence is incomplete; rerun with --resume set to the confirmed project ref.",
      { cause: error },
    );
  }
  await client.from("staff_members").delete().eq("profile_id", userId);
  await client.from("profiles").delete().eq("id", userId);
  await client.auth.admin.deleteUser(userId);
  throw error;
}

process.stdout.write(
  [
    "Managed Owner account created.",
    `Project: ${projectRef}`,
    "Role: owner",
    "MFA: required on first administrative sign-in",
    "Password: accepted from the protected runtime and not displayed",
  ].join("\n") + "\n",
);
