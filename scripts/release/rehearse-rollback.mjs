import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

import {
  getDeploy,
  requireNetlifyEnvironment,
  restoreDeploy,
} from "./netlify.mjs";

const deployId = "local-rollback-fixture";
const siteId = "local-fixture-site";
const calls = [];
const originalFetch = globalThis.fetch;

try {
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    calls.push({ method, pathname: url.pathname });
    const restored = method === "POST";
    return new Response(
      JSON.stringify({
        id: deployId,
        state: restored ? "ready" : "old",
        deploy_url: "https://local-rollback-fixture.example.invalid",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  const config = requireNetlifyEnvironment({
    NETLIFY_AUTH_TOKEN: "local-fixture-token-not-a-real-credential",
    NETLIFY_SITE_ID: siteId,
  });
  const previous = await getDeploy(config, deployId);
  assert.equal(previous.state, "old");
  const restored = await restoreDeploy(config, deployId);
  assert.equal(restored.state, "ready");
  assert.deepEqual(calls, [
    {
      method: "GET",
      pathname: `/api/v1/sites/${siteId}/deploys/${deployId}`,
    },
    {
      method: "POST",
      pathname: `/api/v1/sites/${siteId}/deploys/${deployId}/restore`,
    },
  ]);

  const record = {
    recordedAt: new Date().toISOString(),
    status: "passed",
    scope: "local-fixture-control-plane",
    deployStateChecked: true,
    restoreEndpointChecked: true,
    explicitProductionConfirmationRequiredByLiveScript: true,
    databaseCompatibilityRequiredByLiveScript: true,
    databaseRestoredByNetlify: false,
    productionRollbackExecuted: false,
    blocker: "NETLIFY_SITE_LINK",
  };
  await mkdir("artifacts/releases", { recursive: true });
  await writeFile(
    "artifacts/releases/local-rollback-rehearsal.json",
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    "Local rollback control-plane rehearsal passed; no production deploy was changed.\n",
  );
} finally {
  globalThis.fetch = originalFetch;
}
