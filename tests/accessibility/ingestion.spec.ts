import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import { waitForCompletedRoute } from "@/tests/support/playwright-route";

const localeByProject = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
} as const;

function localEnvironment() {
  const output = execFileSync(
    resolve(process.cwd(), "node_modules/.bin/supabase"),
    ["status", "-o", "env"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  return Object.fromEntries(
    output
      .split("\n")
      .filter((line) => line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [
          line.slice(0, separator),
          JSON.parse(line.slice(separator + 1)),
        ];
      }),
  ) as Record<string, string>;
}

test("ingestion review has two clean responsive accessibility passes", async ({
  page,
}, testInfo) => {
  const locale =
    localeByProject[testInfo.project.name as keyof typeof localeByProject];
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const unique = randomUUID().slice(0, 8);
  const email = `a11y-ingestion-${unique}@epoca.test`;
  const password = "E2e-Accessibility-Password-2026!";
  const { data: created, error: authError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError) throw authError;
  const userId = created.user.id;
  const { error: profileError } = await service.from("profiles").insert({
    id: userId,
    profile_kind: "staff",
    display_name: "Accessibility Manager",
    locale,
  });
  if (profileError) throw profileError;
  const { error: staffError } = await service.from("staff_members").insert({
    profile_id: userId,
    role: "manager",
    active: true,
    mfa_required: false,
    activated_at: new Date().toISOString(),
  });
  if (staffError) throw staffError;
  const { data: batch, error: batchError } = await service.rpc(
    "create_ingestion_batch",
    {
      p_title: `Accessibility ${unique}`,
      p_expected_file_count: 12,
    },
  );
  if (batchError) throw batchError;

  try {
    await page.goto("/en/admin/ingestion");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/ingestion$/);
    await page.goto(`/${locale}/admin/ingestion/${batch.id}/review`);
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/admin/ingestion/${batch.id}/review$`),
    );
    await waitForCompletedRoute(page);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    for (const editor of await page
      .locator("details.translation-editor")
      .all()) {
      if ((await editor.getAttribute("open")) === null) {
        await editor.locator("summary").click();
      }
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `docs/quality/screenshots/ingestion-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await service.from("ingestion_batches").delete().eq("id", batch.id);
    if (batch.product_id) {
      await service.from("products").delete().eq("id", batch.product_id);
    }
    await service.from("staff_members").delete().eq("profile_id", userId);
    await service.auth.admin.deleteUser(userId);
  }
});
