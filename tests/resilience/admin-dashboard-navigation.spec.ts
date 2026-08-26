import { expect, test } from "@playwright/test";

import {
  createAccessStaff,
  localServiceClient,
  signInStaff,
} from "@/tests/support/admin-access";

const locales = ["ka", "en", "de", "ru"] as const;
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
] as const;

test("the Manager dashboard remains available through repeated locale and viewport changes", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440-de",
    "One browser runs the deterministic stress matrix.",
  );
  test.setTimeout(2 * 60_000);

  const service = localServiceClient();
  const manager = await createAccessStaff(service, "manager");
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));

  try {
    await signInStaff(page, manager);

    for (let repetition = 0; repetition < 3; repetition += 1) {
      for (const locale of locales) {
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          const response = await page.goto(`/${locale}/admin`, {
            waitUntil: "load",
          });
          expect(
            response?.status(),
            `${locale}/admin at ${viewport.width}px on repetition ${repetition + 1}`,
          ).toBeLessThan(400);
          await expect(
            page.locator("main.system-state"),
            `${locale}/admin at ${viewport.width}px on repetition ${repetition + 1}`,
          ).toHaveCount(0);
          await expect(page.locator("main h1").first()).toBeVisible();
        }
      }
    }

    expect(clientErrors).toEqual([]);
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
  }
});
