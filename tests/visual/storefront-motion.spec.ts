import { expect, test } from "@playwright/test";

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440-de",
    "Motion timing is verified once; responsive journeys cover every viewport.",
  );
});

test("the archive opens once and reveals later records in sequence", async ({
  page,
}) => {
  await page.goto("/en?motion=automated", { waitUntil: "domcontentloaded" });
  const firstWord = page.locator(".catalog-hero-word > span").first();
  await expect(firstWord).toBeVisible();
  await expect
    .poll(() =>
      firstWord.evaluate((element) => getComputedStyle(element).animationName),
    )
    .toContain("archive-word-in");

  const editorial = page.locator(
    '.home-editorial[data-motion-reveal="curtain"]',
  );
  await editorial.scrollIntoViewIfNeeded();
  await expect(editorial).toHaveAttribute("data-motion-state", "visible");

  const grid = page.locator(".storefront-home .product-grid");
  await grid.scrollIntoViewIfNeeded();
  const cards = grid.locator('[data-motion-reveal="card"]');
  await expect(cards).toHaveCount(4);
  await expect(cards.nth(3)).toHaveAttribute("data-motion-state", "visible");
  await expect
    .poll(() =>
      cards.evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).animationDelay),
      ),
    )
    .toEqual(["0s", "0.05s", "0.1s", "0.15s"]);
});

test("reduced motion keeps the archive static and fully visible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en?motion=reduced", { waitUntil: "domcontentloaded" });

  const firstWord = page.locator(".catalog-hero-word > span").first();
  const editorial = page.locator(
    '.home-editorial[data-motion-reveal="curtain"]',
  );
  await expect(editorial).toHaveAttribute("data-motion-state", "visible");

  const state = await page.evaluate(() => ({
    rootMotion: document.documentElement.getAttribute("data-storefront-motion"),
    wordAnimation: getComputedStyle(
      document.querySelector(".catalog-hero-word > span")!,
    ).animationName,
    panelAnimation: getComputedStyle(
      document.querySelector(".catalog-hero-record")!,
    ).animationName,
    editorialOpacity: getComputedStyle(
      document.querySelector(".home-editorial")!,
    ).opacity,
  }));

  await expect(firstWord).toBeVisible();
  expect(state).toEqual({
    rootMotion: null,
    wordAnimation: "none",
    panelAnimation: "none",
    editorialOpacity: "1",
  });
});
