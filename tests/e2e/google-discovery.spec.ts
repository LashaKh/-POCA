import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const projectLocale = {
  "phone-390-ka": "ka",
  "tablet-768-en": "en",
  "desktop-1440-de": "de",
  "firefox-ru": "ru",
  "webkit-en": "en",
} as const;

test("localized collection paths and breadcrumbs stay accessible and responsive", async ({
  page,
}, testInfo) => {
  const locale =
    projectLocale[testInfo.project.name as keyof typeof projectLocale];
  await page.goto(`/${locale}/collections`);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main .breadcrumbs")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBe(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const collectionLink = page
    .locator('.collection-index-list a[href*="/collections/"]')
    .first();
  await expect(collectionLink).toBeVisible();
  await collectionLink.click();
  await expect(page.locator("main .breadcrumbs")).toBeVisible();
  await expect(
    page.locator('main a[href*="/products/"]').first(),
  ).toBeVisible();
});

test("crawler output stays canonical, navigable, private, and closed when incomplete", async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440-de",
    "One production browser is sufficient for deterministic HTTP output.",
  );

  const baseUrl = testInfo.project.use.baseURL ?? "http://127.0.0.1:3015";
  const root = await request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(root.headers().location).toBe("/ka");

  for (const privatePath of [
    "/ka/account",
    "/ka/auth/sign-in",
    "/ka/cart",
    "/ka/checkout",
    "/ka/order/missing",
    "/ka/payment/return",
    "/ka/quote",
    "/ka/preview/missing",
    "/ka/admin",
  ]) {
    const response = await request.get(privatePath, { maxRedirects: 0 });
    expect(response.headers()["x-robots-tag"], privatePath).toBe(
      "noindex, nofollow",
    );
  }

  for (const feedPath of [
    "/feeds/google/ge-en-gel.xml",
    "/feeds/google/de-de-eur.xml",
    "/feeds/google/unknown.xml",
  ]) {
    expect((await request.get(feedPath)).status(), feedPath).toBe(404);
  }

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapText = await sitemap.text();
  expect(sitemapText).toContain(`<loc>${baseUrl}/ka/collections</loc>`);
  expect(sitemapText).toContain(
    `<loc>${baseUrl}/ka/collections/synthetic-collection</loc>`,
  );
  expect(sitemapText).toContain(`<loc>${baseUrl}/ka/products/syn-00001</loc>`);
  expect(sitemapText).toContain('hreflang="x-default"');
  expect(sitemapText).not.toMatch(
    /<loc>[^<]*(?:account|auth|cart|checkout|order|payment|quote|preview|admin|\?)[^<]*<\/loc>/,
  );

  await page.goto("/ka/collections");
  await page.getByRole("link", { name: "სატესტო კოლექცია" }).click();
  await expect(page).toHaveURL(/\/ka\/collections\/synthetic-collection$/);
  const firstProduct = page.locator('main a[href*="/products/"]').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();
  await expect(page.locator('nav[aria-label="ნავიგაციის გზა"]')).toBeVisible();

  const productPath = new URL(page.url()).pathname;
  await page.goto(`${productPath}?currency=GEL`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${baseUrl}${productPath}`,
  );

  await page.goto("/ka/search?q=synthetic&sort=price-desc");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
