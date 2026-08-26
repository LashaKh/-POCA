import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";

import {
  getDeploy,
  requireNetlifyEnvironment,
  restoreDeploy,
} from "./netlify.mjs";

const config = requireNetlifyEnvironment(process.env);
const deployId = process.env.ROLLBACK_DEPLOY_ID;
if (!deployId) throw new Error("ROLLBACK_DEPLOY_ID_REQUIRED");
if (process.env.DATABASE_COMPATIBILITY_CONFIRMED !== "true") {
  throw new Error("DATABASE_COMPATIBILITY_CONFIRMATION_REQUIRED");
}
const deploy = await getDeploy(config, deployId);
if (deploy.state !== "ready" && deploy.state !== "old") {
  throw new Error(`ROLLBACK_DEPLOY_UNAVAILABLE:${deploy.state}`);
}
if (process.env.CONFIRM_PRODUCTION_ROLLBACK !== "rollback") {
  throw new Error("ROLLBACK_CONFIRMATION_REQUIRED");
}
const restored = await restoreDeploy(config, deployId);
const record = {
  recordedAt: new Date().toISOString(),
  deployId,
  deployUrl: deploy.deploy_url,
  restoredState: restored?.state ?? "published",
  reasonCode: process.env.ROLLBACK_REASON_CODE ?? "OPERATOR_ROLLBACK",
  databaseCompatibilityConfirmed: true,
  databaseRestored: false,
};
await mkdir("artifacts/releases", { recursive: true });
await writeFile(
  `artifacts/releases/${deployId}-rollback.json`,
  `${JSON.stringify(record, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`Deploy ${deployId} restored as the live release.\n`);
