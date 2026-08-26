const apiOrigin = "https://api.netlify.com";

export function requireNetlifyEnvironment(input) {
  const required = ["NETLIFY_AUTH_TOKEN", "NETLIFY_SITE_ID"];
  const missing = required.filter((key) => !input[key]);
  if (missing.length) {
    throw new Error(`MISSING_RELEASE_INPUT:${missing.join(",")}`);
  }
  return {
    token: input.NETLIFY_AUTH_TOKEN,
    siteId: input.NETLIFY_SITE_ID,
  };
}

export async function netlifyRequest(
  path,
  { token, method = "GET", body } = {},
) {
  const response = await fetch(new URL(path, apiOrigin), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`NETLIFY_API_${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function getDeploy(config, deployId) {
  return netlifyRequest(
    `/api/v1/sites/${encodeURIComponent(config.siteId)}/deploys/${encodeURIComponent(deployId)}`,
    { token: config.token },
  );
}

export async function restoreDeploy(config, deployId) {
  return netlifyRequest(
    `/api/v1/sites/${encodeURIComponent(config.siteId)}/deploys/${encodeURIComponent(deployId)}/restore`,
    { token: config.token, method: "POST" },
  );
}
