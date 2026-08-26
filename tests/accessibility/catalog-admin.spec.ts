import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { AppLocale } from "@/i18n/routing";
import type { Database } from "@/lib/supabase/database.types";
import {
  createManager,
  localEnvironment,
} from "@/tests/support/order-operations";

const localeByProject: Record<string, AppLocale> = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
};

test("catalog administration has two accessible responsive passes", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const locale = localeByProject[testInfo.project.name];
  const local = localEnvironment();
  const service = createClient<Database>(
    local.API_URL,
    local.SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const manager = await createManager(service, `Catalog-A11y-${locale}`);
  const marker = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  const productIds = Array.from({ length: 8 }, () => crypto.randomUUID());
  const products = productIds.map((id, index) => ({
    id,
    sku: `A11Y-${marker}-${String(index + 1).padStart(2, "0")}`,
    status: "draft" as const,
    width_mm: 1700 + index,
    length_mm: 2400 + index,
    shape: "rectangle",
    materials: ["wool"],
    construction: "hand-knotted",
    colors: ["indigo"],
    condition: "excellent",
    care_code: "professional-clean",
    delivery_class: "parcel",
  }));
  const productInsert = await service.from("products").insert(products);
  if (productInsert.error) throw productInsert.error;
  const localeNames: Record<AppLocale, string> = {
    ka: "ძალიან გრძელი ქართული კოლექციური ხალიჩის დასახელება",
    en: "A deliberately long collectible carpet administration name",
    de: "Ein absichtlich langer deutscher Name für einen Sammlerteppich",
    ru: "Намеренно длинное русское название коллекционного ковра",
  };
  const translations = productIds.flatMap((productId, index) =>
    (["ka", "en", "de", "ru"] as const).map((translationLocale) => ({
      product_id: productId,
      locale: translationLocale,
      slug: `a11y-${marker}-${index}-${translationLocale}`,
      name: `${localeNames[translationLocale]} ${index + 1}`,
      short_description: localeNames[translationLocale],
      long_description: `${localeNames[translationLocale]}. ${localeNames[translationLocale]}.`,
      search_text: `${marker} accessibility catalog`,
      status: "draft" as const,
    })),
  );
  const related = await Promise.all([
    service.from("product_translations").insert(translations),
    service.from("product_prices").insert(
      productIds.map((productId, index) => ({
        product_id: productId,
        currency: "GEL" as const,
        amount_minor: 100000 + index * 1000,
        enabled: true,
      })),
    ),
    service.from("inventory_items").insert(
      productIds.map((productId, index) => ({
        product_id: productId,
        stock_model: "stocked" as const,
        on_hand_quantity: index,
      })),
    ),
  ]);
  for (const result of related) if (result.error) throw result.error;

  try {
    await page.goto("/en/admin/products");
    await page.getByLabel("Email").fill(manager.email);
    await page.getByLabel("Password").fill(manager.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/products$/);
    await page.goto(`/${locale}/admin/products?query=${marker}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(8);

    const firstPass = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      controls: Array.from(
        document.querySelectorAll(
          "button, input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, textarea",
        ),
      )
        .map((element) => ({
          name:
            element.getAttribute("name") ?? element.textContent?.trim() ?? "",
          className: element.className,
          rect: element.getBoundingClientRect(),
        }))
        .filter((control) => control.rect.width > 0 && control.rect.height > 0),
    }));
    expect(firstPass.overflow).toBe(0);
    expect(firstPass.controls.length).toBeGreaterThan(0);
    expect(
      firstPass.controls
        .filter((control) => control.rect.height < 44)
        .map((control) => ({
          name: control.name,
          className: control.className,
          height: control.rect.height,
        })),
    ).toEqual([]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page
      .getByRole("checkbox", { name: /Select all|Alle|Все|ყველა/i })
      .check();
    const confirmButton = page.getByRole("button", {
      name: /Confirm|bestätigen|Подтвердить|დადასტურება/i,
    });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.focus();
    await expect(confirmButton).toBeFocused();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `docs/quality/screenshots/catalog-admin-${testInfo.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await service.from("inventory_items").delete().in("product_id", productIds);
    await service.from("product_prices").delete().in("product_id", productIds);
    await service
      .from("product_translations")
      .delete()
      .in("product_id", productIds);
    await service.from("products").delete().in("id", productIds);
    await service.auth.admin.deleteUser(manager.userId);
  }
});
