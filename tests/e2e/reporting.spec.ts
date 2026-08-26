import { expect, test } from "@playwright/test";

import {
  createAccessStaff,
  localServiceClient,
  signInStaff,
} from "@/tests/support/admin-access";

test("Manager can read bounded operational metrics and queue a private export", async ({
  page,
}) => {
  const service = localServiceClient();
  const manager = await createAccessStaff(service, "manager");
  await signInStaff(page, manager);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await page.goto(
    "/en/admin/reports?from=2026-08-01&to=2026-08-31&currency=GEL",
  );
  await expect(
    page.getByRole("heading", { name: "Operational reports" }),
  ).toBeVisible();
  await expect(page.getByText("Asia/Tbilisi")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sales" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stock now" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Operations now" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create CSV export" }).click();
  await expect(
    page.getByText("The short-lived report export is queued."),
  ).toBeVisible();
  await expect(
    page.getByText("epoca-operational-report-gel.csv"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
