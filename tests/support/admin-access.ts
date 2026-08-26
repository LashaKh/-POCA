import { createHmac } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import { localEnvironment } from "@/tests/support/order-operations";

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

export function currentTotp(secret: string) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(message)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  return String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000,
  ).padStart(6, "0");
}

export function localServiceClient() {
  const environment = localEnvironment();
  return createClient<Database>(
    environment.API_URL,
    environment.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function createAccessStaff(
  service: SupabaseClient<Database>,
  role: "owner" | "manager",
) {
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const label =
    (role === "owner" ? "Access Owner " : "Access Manager ") + marker;
  const email = "access-" + role + "-" + marker + "@epoca.test";
  const password =
    (role === "owner" ? "Owner-" : "Manager-") + marker + "-Secure-2026!";
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const userId = created.data.user.id;
  const profile = await service.from("profiles").insert({
    id: userId,
    profile_kind: "staff",
    display_name: label,
    locale: "en",
  });
  if (profile.error) throw profile.error;
  const staff = await service.from("staff_members").insert({
    profile_id: userId,
    role,
    active: true,
    mfa_required: role === "owner",
    activated_at: new Date().toISOString(),
  });
  if (staff.error) throw staff.error;
  return { userId, email, password, label };
}

export async function signInStaff(
  page: Page,
  staff: { email: string; password: string },
) {
  await page.goto("/en/admin");
  await page.getByLabel("Email").fill(staff.email);
  await page.getByLabel("Password").fill(staff.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/(?:admin|auth\/mfa)(?:[/?]|$)/);
  await expect(page.getByLabel("Email")).toHaveCount(0);
  await expect(page.locator("main h1").first()).toBeVisible();
  if (new URL(page.url()).pathname === "/en/admin") {
    await expect(page.locator("main.system-state")).toHaveCount(0);
  }
}

export async function enrollOwnerMfa(page: Page) {
  await expect(page).toHaveURL(/\/en\/auth\/mfa/);
  await page.getByRole("button", { name: "Enroll authenticator" }).click();
  const secret = await page.locator(".mfa-enrollment code").textContent();
  if (!secret) throw new Error("MFA_SECRET_NOT_RENDERED");
  await page.getByLabel("Six-digit code").fill(currentTotp(secret.trim()));
  await page.getByRole("button", { name: "Verify securely" }).click();
  await expect(page).toHaveURL(/\/en\/admin$/);
}
