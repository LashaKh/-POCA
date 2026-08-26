import { expect, test } from "@playwright/test";

const scenarios = {
  "phone-390-ka": { locale: "ka", sample: "ქართული ხალიჩა 0123456789 ₾" },
  "tablet-768-en": { locale: "en", sample: "Collector rug 0123456789 €" },
  "desktop-1440-de": { locale: "de", sample: "Sammlerteppich 0123456789 €" },
  "firefox-ru": { locale: "ru", sample: "Коллекционный ковёр 0123456789 ₽" },
  "webkit-en": { locale: "en", sample: "Collector rug 0123456789 $" },
} as const;

test("script-aware fonts and locale formatting load without glyph loss", async ({
  page,
}, testInfo) => {
  const scenario = scenarios[testInfo.project.name as keyof typeof scenarios];
  await page.goto(`/${scenario.locale}`);
  await expect(page.locator(".catalog-hero h1")).toBeVisible();
  const result = await page.evaluate(async ({ locale, sample }) => {
    await document.fonts.ready;
    const probe = document.createElement("p");
    probe.textContent = sample;
    probe.style.cssText = "position:absolute;visibility:hidden;font-size:32px";
    document.body.append(probe);
    const heading = document.querySelector(".catalog-hero h1");
    const bodyFont = getComputedStyle(document.body).fontFamily;
    const headingFont = heading ? getComputedStyle(heading).fontFamily : "";
    const output = {
      fontStatus: document.fonts.status,
      bodyFont,
      headingFont,
      sampleWidth: probe.getBoundingClientRect().width,
      replacementGlyph: document.body.textContent?.includes("�") ?? false,
      number: new Intl.NumberFormat(locale).format(1234567.89),
      currency: new Intl.NumberFormat(locale, {
        style: "currency",
        currency: locale === "ka" ? "GEL" : locale === "de" ? "EUR" : "USD",
      }).format(1234.5),
    };
    probe.remove();
    return output;
  }, scenario);
  expect(result.fontStatus).toBe("loaded");
  expect(result.bodyFont).toContain("Inter");
  expect(result.headingFont).not.toBe(result.bodyFont);
  expect(result.sampleWidth).toBeGreaterThan(100);
  expect(result.replacementGlyph).toBe(false);
  expect(result.number.length).toBeGreaterThan(5);
  expect(result.currency).toMatch(/[₾€$]|GEL|EUR|USD/);
});
