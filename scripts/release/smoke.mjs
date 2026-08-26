import { spawnSync } from "node:child_process";
import process from "node:process";

const target = process.env.SMOKE_BASE_URL;
if (!target || new URL(target).protocol !== "https:") {
  throw new Error("SMOKE_BASE_URL_HTTPS_REQUIRED");
}
const result = spawnSync(
  "node_modules/.bin/playwright",
  ["test", "tests/smoke/production-gates.spec.ts", "--project=desktop-1440-de"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: target,
      EPOCA_EXTERNAL_SMOKE: "1",
    },
  },
);
process.exitCode = result.status ?? 1;
