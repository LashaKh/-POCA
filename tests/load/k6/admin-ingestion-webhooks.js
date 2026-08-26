import http from "k6/http";
import { check } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3015";
const sessionCookie = __ENV.OWNER_SESSION_COOKIE || "";
http.setResponseCallback(
  http.expectedStatuses({ min: 200, max: 399 }, 400, 401, 403),
);

export const options = {
  scenarios: {
    admin_lists: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
      exec: "adminLists",
    },
    ingestion_burst: {
      executor: "per-vu-iterations",
      vus: 15,
      iterations: 3,
      maxDuration: "30s",
      exec: "ingestionBurst",
    },
    invalid_webhook_burst: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 10,
      exec: "invalidWebhookBurst",
    },
  },
  thresholds: {
    "http_req_duration{surface:admin}": ["p(95)<1000"],
    "http_req_duration{surface:ingestion}": ["p(95)<1000"],
    "http_req_duration{surface:webhook}": ["p(95)<500"],
    http_req_failed: ["rate<0.02"],
  },
};

function headers() {
  return sessionCookie ? { Cookie: sessionCookie } : {};
}

export function adminLists() {
  const response = http.get(`${baseUrl}/en/admin/products`, {
    headers: headers(),
    redirects: 0,
    tags: { surface: "admin" },
  });
  check(response, {
    "admin is available or auth-protected": (result) =>
      [200, 302, 303, 307].includes(result.status),
  });
}

export function ingestionBurst() {
  const response = http.get(`${baseUrl}/en/admin/ingestion`, {
    headers: headers(),
    redirects: 0,
    tags: { surface: "ingestion" },
  });
  check(response, {
    "ingestion is available or auth-protected": (result) =>
      [200, 302, 303, 307].includes(result.status),
  });
}

export function invalidWebhookBurst() {
  const response = http.post(
    `${baseUrl}/api/webhooks/tbc`,
    JSON.stringify({ unknown: "synthetic" }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { surface: "webhook" },
    },
  );
  check(response, {
    "invalid webhook fails safely": (result) =>
      [400, 401, 403].includes(result.status),
  });
}
