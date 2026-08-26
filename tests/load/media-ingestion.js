import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const result = spawnSync(
  process.execPath,
  [
    resolve(process.cwd(), "node_modules/vitest/vitest.mjs"),
    "run",
    "--config",
    "tests/load/vitest.config.ts",
  ],
  { stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
