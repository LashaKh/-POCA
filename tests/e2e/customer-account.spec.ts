import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { localEnvironment } from "@/tests/support/order-operations";

async function findRecoveryLink(request: APIRequestContext, email: string) {
  let link = "";
  await expect
    .poll(
      async () => {
        const list = await (
          await request.get("http://127.0.0.1:54324/api/v1/messages")
        ).json();
        const message = list.messages.find(
          (candidate: { To?: Array<{ Address?: string }> }) =>
            candidate.To?.some((recipient) => recipient.Address === email),
        );
        if (!message?.ID) return false;
        const detail = await (
          await request.get(
            `http://127.0.0.1:54324/api/v1/message/${message.ID}`,
          )
        ).json();
        const serialized = JSON.stringify(detail)
          .replaceAll("&amp;", "&")
          .replaceAll("\\u0026", "&");
        link =
          serialized.match(
            /http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^"<\\\s)]+/,
          )?.[0] ?? "";
        return Boolean(link);
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  return link;
}

test("anonymous wishlist becomes a secure customer account with orders, addresses, recovery, sessions, and privacy", async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One browser owns the stateful customer journey.",
  );
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `browser-customer-${marker}@epoca.test`;
  const password = `Customer-${marker}-Secure-2026!`;
  const recoveredPassword = `Recovered-${marker}-Secure-2026!`;

  await page.goto("/en/products/syn-00367");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("button", { name: "Remove from wishlist" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "Wishlist (1)" })).toBeVisible();
  await page.getByRole("link", { name: "Wishlist (1)" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/sign-in/);
  await page.getByRole("link", { name: "Create customer account" }).click();
  await page.getByLabel("Name").fill("Browser Collector");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password", { exact: true }).fill(password);
  await page.getByLabel(/store terms and privacy notice/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/account\/wishlist\?welcome=1$/);
  await expect(
    page.getByRole("heading", { name: "Synthetic Rug 00367" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove from wishlist" }),
  ).toBeVisible();

  await page.goto("/en/account/addresses");
  await page.getByLabel("Label").fill("Home");
  await page.getByLabel("Full name").fill("Browser Collector");
  await page.getByLabel("Address line 1").fill("7 Collector Street");
  await page.getByLabel("City").fill("Tbilisi");
  await page.getByLabel("Phone (optional)").fill("+995555000007");
  await page.getByLabel("Default address").check();
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("Address saved.")).toBeVisible();

  await page.goto("/en/products/syn-00367");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("link", { name: "Cart (1)" }).click();
  await page.getByRole("button", { name: "Review exact total" }).click();
  const checkout = page.locator("form.checkout-form");
  await expect(checkout.getByLabel("Email")).toHaveValue(email);
  await expect(checkout.getByLabel("Full name")).toHaveValue(
    "Browser Collector",
  );
  await expect(checkout.getByLabel("Address line 1")).toHaveValue(
    "7 Collector Street",
  );
  await checkout
    .getByLabel("I accept the store terms and return policy.")
    .check();
  await checkout.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/en\/order\/EPO-[A-Z0-9]{12}$/);
  const reference = (await page.getByText(/Order reference:/).innerText())
    .split(" ")
    .at(-1);
  if (!reference) throw new Error("Customer order reference was not rendered.");
  await page.goto("/en/account/orders");
  await expect(page.getByRole("link", { name: reference })).toBeVisible();
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { name: reference })).toBeVisible();
  await expect(page.getByText("7 Collector Street")).toBeVisible();

  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const userId = users.data.users.find((user) => user.email === email)?.id;
  if (!userId) throw new Error("Customer auth user was not found.");
  const secondarySessionId = crypto.randomUUID();
  expect(
    (
      await service.from("app_sessions").insert({
        auth_session_id: secondarySessionId,
        profile_id: userId,
        assurance_level: "aal1",
        device_label: "Test secondary device",
        user_agent_summary: "Browser journey fixture",
        ip_prefix_hash: "a".repeat(64),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      })
    ).error,
  ).toBeNull();

  await page.goto("/en/account/settings");
  const secondary = page
    .getByRole("listitem")
    .filter({ hasText: "Test secondary device" });
  await expect(secondary).toBeVisible();
  await secondary.getByRole("button", { name: "Revoke" }).click();
  await expect(secondary).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out this session" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/signed-out$/);

  await page.goto("/en/auth/recovery");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send recovery link" }).click();
  await expect(page.getByText(/If the account can be recovered/)).toBeVisible();
  const link = await findRecoveryLink(request, email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/en\/auth\/recovery\?mode=update/);
  await page
    .getByLabel("New password", { exact: true })
    .fill(recoveredPassword);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill(recoveredPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/sign-in\?recovered=true$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(recoveredPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await page.goto("/en/account/wishlist");
  await expect(
    page.getByRole("heading", { name: "Synthetic Rug 00367" }),
  ).toBeVisible();

  await page.goto("/en/account/settings");
  await page.getByLabel("Request type").selectOption("access");
  await page
    .getByLabel("What do you need?")
    .fill("Provide my customer account data");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Your request is recorded.")).toBeVisible();
  await expect(page.getByText(/access · requested/)).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
