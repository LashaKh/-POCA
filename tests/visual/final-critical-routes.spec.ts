import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createAccessStaff,
  enrollOwnerMfa,
  localServiceClient,
  signInStaff,
} from "@/tests/support/admin-access";
import { waitForCompletedRoute } from "@/tests/support/playwright-route";

const locales = ["ka", "en", "de", "ru"] as const;
const viewports = [
  { label: "phone", width: 390, height: 844 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "desktop", width: 1440, height: 1000 },
] as const;

const publicRoutes = [
  { label: "home", path: "" },
  { label: "collection", path: "/collections/synthetic-collection" },
  { label: "product", path: "/products/syn-00001" },
  { label: "search", path: "/search?query=synthetic" },
  { label: "cart", path: "/cart" },
  { label: "checkout", path: "/checkout" },
  { label: "delivery", path: "/delivery" },
  { label: "returns", path: "/returns" },
  { label: "contact", path: "/contact" },
  { label: "journal", path: "/journal" },
  { label: "sign-in", path: "/auth/sign-in" },
] as const;

const adminRoutes = [
  { label: "admin-home", path: "/admin" },
  { label: "admin-products", path: "/admin/products" },
  { label: "admin-product-new", path: "/admin/products/new" },
  { label: "admin-ingestion", path: "/admin/ingestion" },
  { label: "admin-orders", path: "/admin/orders" },
  { label: "admin-returns", path: "/admin/returns" },
  { label: "admin-reports", path: "/admin/reports" },
  { label: "admin-content", path: "/admin/content" },
  { label: "admin-delivery", path: "/admin/settings/delivery" },
] as const;

const ownerRoutes = [
  { label: "owner-audit", path: "/admin/audit" },
  { label: "owner-operations", path: "/admin/operations" },
  { label: "owner-staff", path: "/admin/settings/staff" },
  { label: "owner-privacy", path: "/admin/settings/privacy" },
  { label: "owner-integrations", path: "/admin/settings/integrations" },
] as const;

type ReviewEntry = {
  pass: "diagnostic" | "confirmation";
  locale: (typeof locales)[number];
  viewport: (typeof viewports)[number]["label"];
  width: number;
  route: string;
  overflow: number;
  screenshot?: string;
};

test("all critical routes complete the final four-locale responsive review", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1440-de",
    "The route matrix controls its own locale and viewport combinations.",
  );
  test.setTimeout(15 * 60_000);

  const service = localServiceClient();
  const manager = await createAccessStaff(service, "manager");
  const owner = await createAccessStaff(service, "owner");
  const artifactRoot = path.resolve(
    process.cwd(),
    "artifacts/visual-review/final-critical-routes",
  );
  await mkdir(artifactRoot, { recursive: true });
  const results: ReviewEntry[] = [];
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));

  async function reviewRoute(
    locale: (typeof locales)[number],
    viewport: (typeof viewports)[number],
    route: { label: string; path: string },
    pass: ReviewEntry["pass"],
  ) {
    const response = await page.goto(`/${locale}${route.path}`, {
      waitUntil: "load",
    });
    expect(response?.status(), `${locale}${route.path}`).toBeLessThan(400);
    await waitForCompletedRoute(page);
    if (route.label !== "sign-in") {
      await expect(
        page.locator("main.system-state"),
        `${locale}${route.path} at ${viewport.width}px`,
      ).toHaveCount(0);
    }
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(
      overflow,
      `${locale}${route.path} at ${viewport.width}px`,
    ).toBeLessThanOrEqual(1);
    if (route.label === "journal") {
      const composition = await page.evaluate(() => {
        const siteHeader = document.querySelector<HTMLElement>(".site-header");
        const title = document.querySelector<HTMLElement>(".journal-hero h1");
        const emptyState =
          document.querySelector<HTMLElement>(".journal-empty");
        const collectionLink = document.querySelector<HTMLElement>(
          ".journal-empty-link",
        );
        const footerWordmark =
          document.querySelector<HTMLElement>(".footer-wordmark");
        const titleRange = document.createRange();
        if (title) titleRange.selectNodeContents(title);
        return {
          headerHeight: siteHeader?.getBoundingClientRect().height ?? 0,
          titleLineCount: title
            ? new Set(
                Array.from(titleRange.getClientRects()).map((rect) =>
                  Math.round(rect.top),
                ),
              ).size
            : 0,
          emptyStateVisible: Boolean(emptyState?.getClientRects().length),
          collectionLinkVisible: Boolean(
            collectionLink?.getClientRects().length,
          ),
          footerWordmarkVisible: Boolean(
            footerWordmark?.getClientRects().length,
          ),
        };
      });
      const maximumHeaderHeight = viewport.width >= 1_000 ? 170 : 320;
      expect(composition.headerHeight).toBeLessThanOrEqual(maximumHeaderHeight);
      expect(composition.titleLineCount).toBe(1);
      expect(composition.emptyStateVisible).toBe(true);
      expect(composition.collectionLinkVisible).toBe(true);
      expect(composition.footerWordmarkVisible).toBe(true);
    }
    const entry: ReviewEntry = {
      pass,
      locale,
      viewport: viewport.label,
      width: viewport.width,
      route: route.path || "/",
      overflow,
    };
    if (pass === "confirmation") {
      const fileName = `${locale}-${viewport.width}-${route.label}.jpg`;
      await page.screenshot({
        path: path.join(artifactRoot, fileName),
        type: "jpeg",
        quality: 60,
        animations: "disabled",
        caret: "initial",
        fullPage: false,
      });
      entry.screenshot = fileName;
    }
    results.push(entry);
  }

  try {
    for (const pass of ["diagnostic", "confirmation"] as const) {
      for (const locale of locales) {
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          for (const route of publicRoutes) {
            await reviewRoute(locale, viewport, route, pass);
          }
        }
      }
    }

    await page.context().clearCookies();
    await page.setViewportSize(viewports[2]);
    await signInStaff(page, owner);
    await enrollOwnerMfa(page);

    for (const pass of ["diagnostic", "confirmation"] as const) {
      for (const locale of locales) {
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          for (const route of ownerRoutes) {
            await reviewRoute(locale, viewport, route, pass);
          }
        }
      }
    }

    await page.context().clearCookies();
    await page.setViewportSize(viewports[2]);
    await signInStaff(page, manager);
    await expect(page).toHaveURL(/\/en\/admin$/);

    for (const pass of ["diagnostic", "confirmation"] as const) {
      for (const locale of locales) {
        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          for (const route of adminRoutes) {
            await reviewRoute(locale, viewport, route, pass);
          }
        }
      }
    }

    expect(clientErrors).toEqual([]);
    await writeFile(
      path.join(artifactRoot, "manifest.json"),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          combinations: locales.length * viewports.length,
          routes: publicRoutes.length + adminRoutes.length + ownerRoutes.length,
          diagnosticChecks: results.filter(
            (entry) => entry.pass === "diagnostic",
          ).length,
          confirmationChecks: results.filter(
            (entry) => entry.pass === "confirmation",
          ).length,
          screenshots: results.filter((entry) => entry.screenshot).length,
          clientErrors,
          results,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  } finally {
    await service.auth.admin.deleteUser(manager.userId);
    await service.auth.admin.deleteUser(owner.userId);
  }
});
