import type { Page } from "@playwright/test";

export async function waitForCompletedRoute(page: Page) {
  await page.waitForFunction(() => {
    const main = document.querySelector('main:not([aria-busy="true"])');
    const heading = main?.querySelector("h1");
    return Boolean(heading && !heading.closest("[hidden]"));
  });
}
