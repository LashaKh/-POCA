import { expect, test } from "@playwright/test";

import {
  createAccessStaff,
  enrollOwnerMfa,
  localServiceClient,
  signInStaff,
} from "@/tests/support/admin-access";

test("Manager and MFA Owner boundaries govern staff, sessions, and audit", async ({
  page,
}) => {
  const service = localServiceClient();
  const manager = await createAccessStaff(service, "manager");
  const owner = await createAccessStaff(service, "owner");

  await signInStaff(page, manager);
  await expect(page).toHaveURL(/\/en\/admin$/);
  await expect(page.getByRole("link", { name: "Security" })).toHaveCount(0);
  await page.goto("/en/admin/settings/staff");
  await expect(
    page.getByRole("heading", { name: "This page is not in the collection" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Staff access" })).toHaveCount(
    0,
  );

  await page.goto("/en");
  await page.context().clearCookies();
  await signInStaff(page, owner);
  await enrollOwnerMfa(page);
  await expect(page.getByRole("link", { name: "Security" })).toBeVisible();

  await page.goto("/en/admin/settings/integrations");
  await expect(
    page.getByRole("heading", { name: "Configuration status" }),
  ).toBeVisible();
  await expect(page.getByText(/sb_secret/i)).toHaveCount(0);

  await page.goto("/en/admin/settings/staff");
  const managerRow = page.getByRole("row").filter({ hasText: manager.label });
  await expect(managerRow).toContainText("manager");
  const revokeDetails = managerRow
    .locator("details")
    .filter({ hasText: "Revoke all sessions" });
  await revokeDetails.getByText("Revoke all sessions").click();
  await revokeDetails
    .getByLabel(new RegExp("SESSION REVOKE ALL " + manager.userId))
    .fill("SESSION REVOKE ALL " + manager.userId);
  await revokeDetails
    .getByLabel(/Reason/)
    .fill("End all Manager sessions during access review");
  await revokeDetails.getByRole("button", { name: "Revoke sessions" }).click();
  await expect(managerRow.getByText("Change completed.")).toBeVisible();

  const deactivateDetails = managerRow
    .locator("details")
    .filter({ hasText: "Deactivate access" });
  await deactivateDetails.getByText("Deactivate access").click();
  await deactivateDetails
    .getByLabel(new RegExp("STAFF DEACTIVATE " + manager.userId))
    .fill("STAFF DEACTIVATE " + manager.userId);
  await deactivateDetails
    .getByLabel(/Reason/)
    .fill("Manager lifecycle browser verification");
  await deactivateDetails.getByRole("button", { name: "Deactivate" }).click();
  await expect(managerRow).toContainText("Inactive");

  await page.goto("/en/admin/audit?query=security.staff.manage");
  await expect(
    page.getByRole("heading", { name: "Audit evidence" }),
  ).toBeVisible();
  await expect(page.getByText("security.staff.manage").first()).toBeVisible();
  await expect(page.getByText(manager.userId).first()).toBeVisible();
});
