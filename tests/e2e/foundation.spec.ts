import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const projectLocale = {
  "phone-390-ka": { locale: "ka", heading: "ხალიჩები, აღწერილი სიზუსტით." },
  "tablet-768-en": {
    locale: "en",
    heading: "Carpets, recorded with care.",
  },
  "desktop-1440-de": {
    locale: "de",
    heading: "Teppiche, sorgfältig erfasst.",
  },
  "firefox-ru": { locale: "ru", heading: "Ковры, описанные с вниманием." },
  "webkit-en": { locale: "en", heading: "Carpets, recorded with care." },
} as const;

test("localized foundation is truthful, responsive, and accessible", async ({
  page,
}, testInfo) => {
  const expected =
    projectLocale[testInfo.project.name as keyof typeof projectLocale];
  const response = await page.goto(`/${expected.locale}`);

  await expect(page.locator("html")).toHaveAttribute("lang", expected.locale);
  await expect(
    page.getByRole("heading", { level: 1, name: expected.heading }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: /language|sprache|ენა|язык/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /content|inhalt|შინაარს|содержим/i }),
  ).toHaveAttribute("href", "#main-content");

  const horizontalOverflow = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      0,
    ),
  );
  expect(horizontalOverflow).toBe(0);
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});

test("protected administration redirects without leaking content", async ({
  page,
}, testInfo) => {
  const expected =
    projectLocale[testInfo.project.name as keyof typeof projectLocale];
  await page.goto(`/${expected.locale}/admin`);

  await expect(page).toHaveURL(new RegExp(`/${expected.locale}/auth/sign-in`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByText(
      /operational areas|arbeitsbereiche|სამუშაო განყოფილებები|рабочие разделы/i,
    ),
  ).toHaveCount(0);
});
