import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3015";
const localPort = new URL(baseURL).port || "3015";

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "e2e/**/*.spec.ts",
    "smoke/**/*.spec.ts",
    "visual/**/*.spec.ts",
    "accessibility/**/*.spec.ts",
    "seo/**/*.spec.ts",
    "resilience/**/*.spec.ts",
  ],
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  // Browser journeys share one stateful local Supabase project. Serializing
  // them prevents one test's staff, inventory, MFA, or order mutations from
  // racing another test's assertions.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "phone-390-ka",
      use: {
        ...devices["iPhone 13"],
        locale: "ka-GE",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "tablet-768-en",
      use: {
        ...devices["iPad (gen 7)"],
        locale: "en-GB",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "desktop-1440-de",
      use: {
        ...devices["Desktop Chrome"],
        locale: "de-DE",
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "firefox-ru",
      use: {
        ...devices["Desktop Firefox"],
        locale: "ru-RU",
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "webkit-en",
      use: {
        ...devices["Desktop Safari"],
        locale: "en-GB",
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: process.env.EPOCA_EXTERNAL_SMOKE
    ? undefined
    : {
        command: `SITE_URL=${baseURL} npm run build:local && PORT=${localPort} SITE_URL=${baseURL} npm run start:local`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
