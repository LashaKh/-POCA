import { expect, test } from "@playwright/test";

import {
  createAccessStaff,
  localServiceClient,
  signInStaff,
} from "@/tests/support/admin-access";

const locales = ["ka", "en", "de", "ru"] as const;

test("generated production output exposes truthful localized discovery metadata", async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440-de",
    "One production browser is sufficient for deterministic generated markup.",
  );

  const baseUrl = testInfo.project.use.baseURL ?? "http://127.0.0.1:3015";
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain("Disallow: /*/admin/");
  expect(robotsText).toContain("Disallow: /*/checkout");
  expect(robotsText).toContain(`Sitemap: ${baseUrl}/sitemap.xml`);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const sitemapText = await sitemap.text();
  for (const locale of locales) {
    expect(sitemapText).toContain(`<loc>${baseUrl}/${locale}</loc>`);
    expect(sitemapText).toContain(
      `<loc>${baseUrl}/${locale}/products/syn-00001</loc>`,
    );
  }

  for (const locale of locales) {
    await page.goto(`/${locale}/products/syn-00001`);
    const localizedTitle = (
      await page.locator(".product-record h1").textContent()
    )?.trim();
    expect(localizedTitle).toBeTruthy();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${baseUrl}/${locale}/products/syn-00001`,
    );
    for (const alternate of locales) {
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${alternate}"]`),
      ).toHaveAttribute("href", `${baseUrl}/${alternate}/products/syn-00001`);
    }
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveAttribute("href", `${baseUrl}/ka/products/syn-00001`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      localizedTitle!,
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      localizedTitle!,
    );
    const structured = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    const records = JSON.parse(structured ?? "[]") as Array<{
      "@type"?: string;
      offers?: { availability?: string; priceCurrency?: string };
    }>;
    expect(records.map((record) => record["@type"])).toEqual(
      expect.arrayContaining(["BreadcrumbList", "OnlineStore"]),
    );
    expect(
      records.find((record) => record["@type"] === "Product"),
    ).toBeUndefined();
  }

  await page.goto("/en/search?query=synthetic");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );

  const preview = await page.goto(
    "/en/preview/00000000-0000-4000-8000-000000000000",
  );
  expect(preview?.status()).toBeLessThan(400);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );

  const service = localServiceClient();
  const manager = await createAccessStaff(service, "manager");
  const redirectId = crypto.randomUUID();
  const sourcePath = `/legacy-seo-${redirectId}`;
  try {
    await page.context().clearCookies();
    await signInStaff(page, manager);
    await expect(page).toHaveURL(/\/en\/admin$/);
    await page.goto("/en/admin");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );

    const inserted = await service.from("content_redirects").insert({
      id: redirectId,
      source_path: sourcePath,
      destination_path: "/about",
      http_status: 308,
      status: "published",
      active_from: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(inserted.error).toBeNull();
    const redirected = await request.get(`/en${sourcePath}`, {
      maxRedirects: 0,
    });
    expect(redirected.status()).toBe(308);
    expect(new URL(redirected.headers().location!, baseUrl).toString()).toBe(
      `${baseUrl}/en/about`,
    );
  } finally {
    await service.from("content_redirects").delete().eq("id", redirectId);
    await service.auth.admin.deleteUser(manager.userId);
  }
});
