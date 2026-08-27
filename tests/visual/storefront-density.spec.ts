import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { label: "phone", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 1000 },
] as const;

const routes = [
  { label: "home", path: "/en", heading: ".catalog-hero h1" },
  {
    label: "product",
    path: "/en/products/syn-00004",
    heading: ".product-record h1",
  },
  { label: "journal", path: "/en/journal", heading: ".journal-hero h1" },
] as const;

test("storefront keeps an editorial rather than browser-zoomed density", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440-de",
    "One Chromium project drives the required responsive viewport matrix.",
  );

  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);

    for (const route of routes) {
      const response = await page.goto(route.path, { waitUntil: "load" });
      expect(response?.status(), `${route.label} at ${viewport.width}px`).toBe(
        200,
      );
      await expect(page.locator(route.heading)).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));

      const composition = await page.evaluate(
        ({ headingSelector, desktop }) => {
          const heading = document.querySelector<HTMLElement>(headingSelector);
          const header = document.querySelector<HTMLElement>(".site-header");
          const hero = document.querySelector<HTMLElement>(".catalog-hero");
          const productStage = document.querySelector<HTMLElement>(
            ".product-gallery-stage",
          );
          const footerWordmark =
            document.querySelector<HTMLElement>(".footer-wordmark");
          const nextHomeSection = document.querySelector<HTMLElement>(
            ".catalog-notice, .catalog-section",
          );

          return {
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            headingSize: heading
              ? Number.parseFloat(getComputedStyle(heading).fontSize)
              : 0,
            headerHeight: header?.getBoundingClientRect().height ?? 0,
            heroHeight: hero?.getBoundingClientRect().height ?? 0,
            productStageWidth: productStage?.getBoundingClientRect().width ?? 0,
            productRecordTop:
              document
                .querySelector<HTMLElement>(".product-record")
                ?.getBoundingClientRect().top ?? 0,
            productStageTop: productStage?.getBoundingClientRect().top ?? 0,
            footerWordmarkSize: footerWordmark
              ? Number.parseFloat(getComputedStyle(footerWordmark).fontSize)
              : 0,
            nextHomeSectionTop:
              nextHomeSection?.getBoundingClientRect().top ?? 0,
            desktop,
          };
        },
        { headingSelector: route.heading, desktop: viewport.width >= 1025 },
      );

      expect(composition.overflow).toBeLessThanOrEqual(1);
      expect(composition.headerHeight).toBeLessThanOrEqual(
        viewport.width >= 1025 ? 116 : 320,
      );
      expect(composition.headingSize).toBeLessThanOrEqual(
        viewport.width >= 1025 ? 120 : 80,
      );

      if (route.label === "home" && composition.desktop) {
        expect(composition.heroHeight).toBeLessThanOrEqual(520);
        expect(composition.headingSize).toBeLessThanOrEqual(66);
        expect(composition.nextHomeSectionTop).toBeLessThanOrEqual(650);
      }

      if (route.label === "product" && composition.desktop) {
        expect(composition.productStageWidth).toBeLessThanOrEqual(480);
        expect(composition.headingSize).toBeLessThanOrEqual(58);
      }

      if (route.label === "product" && viewport.label === "tablet") {
        expect(
          Math.abs(composition.productRecordTop - composition.productStageTop),
        ).toBeLessThanOrEqual(80);
      }

      if (route.label === "journal" && composition.desktop) {
        expect(composition.footerWordmarkSize).toBeLessThanOrEqual(90);
      }

      await page.screenshot({
        path: testInfo.outputPath(
          `density-${viewport.label}-${route.label}.png`,
        ),
        animations: "disabled",
        fullPage: false,
      });
    }
  }

  const newsletterHeightBudgets = {
    phone: 520,
    tablet: 420,
    desktop: 280,
  } as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/en/products/syn-00004");
    await page.locator(".site-footer-wrapper").scrollIntoViewIfNeeded();
    const footerDensity = await page.evaluate(() => ({
      newsletterHeight:
        document
          .querySelector<HTMLElement>(".newsletter-panel")
          ?.getBoundingClientRect().height ?? 0,
      footerHeight:
        document
          .querySelector<HTMLElement>(".site-footer")
          ?.getBoundingClientRect().height ?? 0,
    }));
    expect(footerDensity.newsletterHeight).toBeLessThanOrEqual(
      newsletterHeightBudgets[viewport.label],
    );
    if (viewport.label === "desktop") {
      expect(footerDensity.footerHeight).toBeLessThanOrEqual(300);
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
    await page.locator(".site-footer-wrapper").screenshot({
      path: testInfo.outputPath(`density-${viewport.label}-footer.png`),
      animations: "disabled",
    });
  }

  await page.setViewportSize(viewports[0]);
  await page.goto("/en");
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(clientErrors).toEqual([]);
});
