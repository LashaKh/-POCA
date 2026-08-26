import { expect, test, type Page } from "@playwright/test";

async function expectReadyMain(page: Page) {
  await expect(page.locator('main:not([aria-busy="true"])')).toBeVisible();
}

test.describe("production smoke gates", () => {
  test("reports liveness and secret-free readiness", async ({ request }) => {
    const live = await request.get("/api/health/live");
    expect(live.status()).toBe(200);
    expect(await live.json()).toMatchObject({ status: "ok" });

    const ready = await request.get("/api/health/ready");
    expect([200, 503]).toContain(ready.status());
    const body = await ready.json();
    expect(body).toHaveProperty("status");
    expect(body).not.toHaveProperty("checks");
    expect(JSON.stringify(body)).not.toMatch(/secret|service_role|password/i);
  });

  test("keeps discovery, search, product, cart, and checkout reachable", async ({
    page,
  }) => {
    await page.goto("/en");
    await expectReadyMain(page);
    await page.goto("/en/search?q=rug");
    await expectReadyMain(page);
    const product = page.locator('a[href*="/products/"]').first();
    if (await product.isVisible()) {
      await product.click();
      await expectReadyMain(page);
    }
    await page.goto("/en/cart");
    await expectReadyMain(page);
    await page.goto("/en/checkout");
    await expectReadyMain(page);
  });

  test("protects ingestion and order operations behind staff authentication", async ({
    page,
  }) => {
    for (const route of ["/en/admin/ingestion", "/en/admin/orders"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/en\/auth\/sign-in/);
      await expect(page.getByLabel(/email/i)).toBeVisible();
    }
  });

  test("keeps MFA, recovery, and dependency-disabled responses safe", async ({
    page,
    request,
  }) => {
    await page.goto("/en/auth/recovery");
    await expectReadyMain(page);
    await page.goto("/en/auth/mfa");
    await expectReadyMain(page);

    const missingPayment = await request.get(
      "/api/payments/fixture/not-a-real-reference",
    );
    expect([400, 404]).toContain(missingPayment.status());
    expect(await missingPayment.text()).not.toMatch(
      /stack|service_role|secret/i,
    );
  });
});
