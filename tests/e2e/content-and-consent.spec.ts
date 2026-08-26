import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

test("staff publishing and buyer contact, newsletter, and privacy choices stay recoverable", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "tablet-768-en",
    "One browser owns the stateful content journey.",
  );
  test.setTimeout(180_000);
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const manager = await createManager(service, `Content-Browser-${marker}`);
  const entryKey = `browser-story-${marker}`;

  try {
    await page.goto("/en/admin/content");
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/content$/);
    await page.getByRole("link", { name: "Create content" }).click();
    const editorForm = page.locator(".content-editor-layout > form");
    await expect
      .poll(
        () =>
          editorForm.evaluate((form) => {
            const propertyKey = Object.keys(form).find((key) =>
              key.startsWith("__reactProps$"),
            );
            if (!propertyKey) return "not-hydrated";
            const properties = Reflect.get(form, propertyKey) as {
              action?: unknown;
            };
            return typeof properties.action;
          }),
        { message: "content editor form must be hydrated", timeout: 20_000 },
      )
      .toBe("function");
    await page.getByLabel("Stable key").fill(entryKey);
    await page.getByLabel("Content type").selectOption("journal");
    await page.getByLabel("Missing-language policy").selectOption("strict");
    const localeNames = ["KA", "EN", "DE", "RU"];
    for (let index = 0; index < localeNames.length; index += 1) {
      const group = page.getByRole("group", { name: localeNames[index] });
      await group
        .getByLabel("URL slug")
        .fill(`${entryKey}-${localeNames[index]!.toLowerCase()}`);
      await group
        .getByLabel("Title", { exact: true })
        .fill(`Browser Story ${localeNames[index]}`);
      await group
        .getByLabel("Summary")
        .fill(`Reviewed ${localeNames[index]} browser summary.`);
      await group.getByLabel("Portable blocks (JSON)").fill(
        JSON.stringify([
          {
            type: "paragraph",
            text: `Reviewed browser content ${localeNames[index]}.`,
          },
        ]),
      );
      await group
        .getByLabel("Search title")
        .fill(`Browser Story ${localeNames[index]}`);
      await group
        .getByLabel("Search description")
        .fill(`Reviewed browser metadata ${localeNames[index]}.`);
      await group.getByLabel("Translation review").selectOption("approved");
    }
    await page
      .getByLabel("Reason for change")
      .fill("Create browser content fixture");
    const invalidControls = await editorForm
      .locator(":invalid")
      .evaluateAll((controls) =>
        controls.map((control) => {
          const field = control as
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement;
          return {
            message: field.validationMessage,
            name: field.name,
            value: field.value,
          };
        }),
      );
    expect(
      invalidControls,
      "content editor must be natively valid before save",
    ).toEqual([]);
    await editorForm.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    const entry = await service
      .from("content_entries")
      .select("id,version")
      .eq("entry_key", entryKey)
      .single();
    if (entry.error) throw entry.error;

    await page.goto(`/en/admin/content/${entry.data.id}`);
    await page
      .getByRole("button", { name: "Create 30-minute preview" })
      .click();
    const previewLink = page.getByRole("link", { name: "Open preview" });
    await expect(previewLink).toBeVisible();
    const previewPath = await previewLink.getAttribute("href");
    if (!previewPath) throw new Error("PREVIEW_PATH_NOT_RENDERED");
    await page.goto(previewPath);
    await expect(
      page.getByRole("heading", { name: "Browser Story EN" }),
    ).toBeVisible();
    await expect(page.getByText(/Private preview/)).toBeVisible();

    await page.goto(`/en/admin/content/${entry.data.id}`);
    await page.getByLabel("Target state").selectOption("scheduled");
    await page
      .getByLabel("Publish at", { exact: true })
      .fill(new Date(Date.now() + 3_600_000).toISOString().slice(0, 16));
    await page
      .getByLabel("Reason for change")
      .last()
      .fill("Schedule browser story");
    await page.getByRole("button", { name: "Apply state" }).click();
    await expect(page.getByText("Saved.").last()).toBeVisible();
    await service
      .from("content_entries")
      .update({ publish_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", entry.data.id);
    await service.rpc("run_content_contact_consent_maintenance", {
      p_delete_limit: 100,
    });

    await page.goto("/en/admin/content/navigation");
    const headerMenu = page
      .locator("form")
      .filter({ has: page.getByRole("heading", { name: "header" }) });
    await headerMenu.getByLabel("Status").selectOption("published");
    await headerMenu.getByLabel("Ordered menu items (JSON)").fill(
      JSON.stringify([
        {
          itemKey: `story-${marker}`,
          destinationPath: `/journal/${entryKey}-en`,
          labels: {
            ka: "ამბავი",
            en: "Browser story",
            de: "Browser-Geschichte",
            ru: "История",
          },
          position: 10,
          enabled: true,
        },
      ]),
    );
    await headerMenu
      .getByLabel("Reason for change")
      .fill("Publish browser navigation");
    await headerMenu
      .getByRole("button", { name: "Save menu revision" })
      .click();
    await expect(headerMenu.getByText("Saved.")).toBeVisible();

    await page.goto("/en/admin/content/redirects");
    const redirect = page
      .locator("form")
      .filter({ has: page.getByRole("heading", { name: "New redirect" }) });
    await redirect.getByLabel("Source path").fill(`/legacy-${marker}`);
    await redirect.getByLabel("Destination path").fill("/about");
    await redirect.locator('select[name="status"]').selectOption("published");
    await redirect
      .getByLabel("Reason for change")
      .fill("Preserve browser legacy URL");
    await redirect.getByRole("button", { name: "Save" }).click();
    await expect(redirect.getByText("Saved.")).toBeVisible();

    await page.context().clearCookies();
    await page.goto(`/en/legacy-${marker}`);
    await expect(page).toHaveURL(/\/en\/about$/);
    await page.goto("/en");
    await expect(
      page.getByRole("link", { name: "Browser story" }),
    ).toBeVisible();

    await page.goto("/en/contact");
    const contactForm = page.locator(".contact-form");
    await contactForm.getByLabel("Name").fill("Browser Buyer");
    await contactForm.getByLabel("Email").fill(`buyer-${marker}@epoca.test`);
    await contactForm.getByLabel("Subject").fill("Private browser question");
    await contactForm
      .getByLabel("Message")
      .fill("Please confirm that this message remains private.");
    await contactForm.getByRole("button", { name: "Send message" }).click();
    await expect(
      page.getByRole("heading", { name: "Your message was received." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Check message status" }).click();
    await expect(page).toHaveURL(/\/en\/contact\/MSG-[A-Z0-9]{12}$/);
    await expect(page.getByText(/received/i)).toBeVisible();

    await page.goto("/en");
    const newsletter = page.locator(".newsletter-panel");
    await newsletter
      .getByLabel("Email")
      .first()
      .fill(`news-${marker}@epoca.test`);
    await newsletter.getByRole("button", { name: "Subscribe" }).click();
    await expect(newsletter.getByText("Subscription recorded.")).toBeVisible();
    const withdrawal = newsletter.locator("details");
    await withdrawal.getByText("Unsubscribe", { exact: true }).first().click();
    await withdrawal.getByLabel("Email").fill(`news-${marker}@epoca.test`);
    await withdrawal.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(
      withdrawal.getByText("The subscription is withdrawn."),
    ).toBeVisible();
    await page.getByText("Manage privacy choices").click();
    const analytics = page.getByRole("group", {
      name: "Allow privacy-limited analytics",
    });
    await analytics.getByLabel("Allow").check();
    await page.getByRole("button", { name: "Save choices" }).click();
    await expect(page.getByText("Privacy choices saved.")).toBeVisible();
    await page.reload();
    await page.getByText("Manage privacy choices").click();
    const analyticsWithdrawal = page.getByRole("group", {
      name: "Allow privacy-limited analytics",
    });
    await analyticsWithdrawal.getByLabel("Refuse").check();
    await page.getByRole("button", { name: "Save choices" }).click();
    await expect(page.getByText("Privacy choices saved.")).toBeVisible();
    await expect
      .poll(async () => {
        const choiceCookie = (await page.context().cookies()).find(
          (cookie) => cookie.name === "epoca_optional_consent",
        );
        return decodeURIComponent(choiceCookie?.value ?? "");
      })
      .toContain('"analytics":"withdrawn"');
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
  }
});
