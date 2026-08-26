import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import {
  getDeploy,
  requireNetlifyEnvironment,
  restoreDeploy,
} from "./netlify.mjs";

const config = requireNetlifyEnvironment(process.env);
const deployId = process.env.NETLIFY_DEPLOY_ID;
const target = process.env.RELEASE_TARGET;
if (!deployId || !["preview", "staging", "production"].includes(target ?? "")) {
  throw new Error("INVALID_RELEASE_TARGET");
}
const readiness = JSON.parse(
  await readFile("artifacts/readiness/latest.json", "utf8"),
);
const allowedStages = {
  preview: [
    "build-complete",
    "payment-ready",
    "staging-operational",
    "launch-ready",
  ],
  staging: ["payment-ready", "staging-operational", "launch-ready"],
  production: ["launch-ready"],
};
if (!allowedStages[target].includes(readiness.highestStage)) {
  throw new Error(`READINESS_BLOCKED:${readiness.highestStage}`);
}
const deploy = await getDeploy(config, deployId);
if (deploy.state !== "ready")
  throw new Error(`DEPLOY_NOT_READY:${deploy.state}`);

let published = false;
if (target === "production") {
  if (process.env.CONFIRM_PRODUCTION_PROMOTION !== "publish") {
    throw new Error("PRODUCTION_CONFIRMATION_REQUIRED");
  }
  await restoreDeploy(config, deployId);
  published = true;
}
const record = {
  recordedAt: new Date().toISOString(),
  target,
  deployId,
  deployUrl: deploy.deploy_url,
  commitRef: deploy.commit_ref ?? null,
  state: deploy.state,
  published,
  readinessStage: readiness.highestStage,
};
await mkdir("artifacts/releases", { recursive: true });
await writeFile(
  `artifacts/releases/${deployId}-${target}.json`,
  `${JSON.stringify(record, null, 2)}\n`,
  "utf8",
);
process.stdout.write(
  `${target} release ${deployId} validated${published ? " and published" : " as a candidate"}.\n`,
);
