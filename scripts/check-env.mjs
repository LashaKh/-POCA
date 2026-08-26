import process from "node:process";

import { getSafeEnvironmentStatus } from "../lib/env/status.ts";

const status = getSafeEnvironmentStatus(process.env);
if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
} else if (status.valid) {
  process.stdout.write(
    `Environment contract passed for ${status.environment} (${status.release}).\n`,
  );
} else {
  process.stderr.write(
    `Environment contract failed: ${status.invalidFields.join(", ")}\n`,
  );
}
if (!status.valid) process.exitCode = 1;
