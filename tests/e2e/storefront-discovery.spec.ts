import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const projectLocale = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
} as const;

test("published collection, search, and product records remain truthful", async ({
  page,
}, testInfo) => {
  const locale =
    projectLocale[testInfo.project.name as keyof typeof projectLocale];
  await page.goto(`/${locale}/collections/synthetic-collection`);

  await expect(page.locator(".product-card")).toHaveCount(24);
  await expect(
    page.getByText(/synthet|синтетич|სინთეზურ/i).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);

  await page.goto(`/${locale}/search?q=SYN-00001`);
  expect(await page.locator(".product-card").count()).toBeGreaterThan(0);
  await page.locator('.product-card a[href$="/products/syn-00001"]').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/products/syn-00001`));
  await expect(page.getByText("SYN-00001")).toBeVisible();
  await expect(
    page.locator('.product-gallery img, .product-gallery [role="img"]').first(),
  ).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("no-results and unavailable states recover without draft leakage", async ({
  page,
}, testInfo) => {
  const locale =
    projectLocale[testInfo.project.name as keyof typeof projectLocale];
  await page.goto(`/${locale}/search?q=secret+draft+phrase`);
  await expect(page.locator(".product-card")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /clear|löschen|გასუფთავება|очистить/i }),
  ).toBeVisible();

  await page.goto(`/${locale}/products/syn-00013`);
  await expect(
    page.getByText(/unavailable|nicht verfügbar|მიუწვდომელია|недоступен/i),
  ).toBeVisible();
  await expect(
    page.getByText(/authentic|sustainable|limited edition/i),
  ).toHaveCount(0);
});

test("database filters, stable sorting, locale paths, and currency preferences work", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90_000);
  const locale =
    projectLocale[testInfo.project.name as keyof typeof projectLocale];
  await page.goto(`/${locale}/collections/synthetic-collection`);

  const controls = page.locator(".catalog-controls");
  await controls.locator('select[name="material"]').selectOption("silk");
  await controls.locator('select[name="color"]').selectOption("ivory");
  await controls.locator('select[name="sort"]').selectOption("price-desc");
  await controls.locator('input[name="availability"]').check();
  await controls.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/material=silk/);
  await expect(page).toHaveURL(/color=ivory/);
  await expect(page).toHaveURL(/availability=in-stock/);
  await expect(page.locator(".product-card")).toHaveCount(24);
  await expect(page.locator(".product-card a").first()).toHaveAttribute(
    "href",
    new RegExp(`/${locale}/products/syn-04980$`),
  );

  await page.locator(".product-card a").first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/products/syn-04980$`));
  const targetLocale = locale === "en" ? "de" : "en";
  const targetLanguage = targetLocale === "de" ? "Deutsch" : "English";
  const languageLink = page.getByRole("link", {
    name: targetLanguage,
    exact: true,
  });
  if (!(await languageLink.isVisible())) {
    const navigationDrawer = page.locator("details.site-navigation-drawer");
    await expect(navigationDrawer).toBeVisible();
    await navigationDrawer.locator("summary").click();
  }
  await languageLink.click();
  await expect(page).toHaveURL(
    new RegExp(`/${targetLocale}/products/syn-04980$`),
  );
  await expect(page.getByText("SYN-04980")).toBeVisible();

  const currencyControl = page.locator('select[name="currency"]:visible');
  if (!(await currencyControl.isVisible())) {
    const navigationDrawer = page.locator("details.site-navigation-drawer");
    await expect(navigationDrawer).toBeVisible();
    await navigationDrawer.locator("summary").click();
  }
  await currencyControl.selectOption("EUR");
  await expect
    .poll(async () => {
      const cookies = await context.cookies();
      return cookies.find((cookie) => cookie.name === "epoca_currency")?.value;
    })
    .toBe("EUR");
  await expect(page.locator(".product-price")).toContainText("EUR");
});
