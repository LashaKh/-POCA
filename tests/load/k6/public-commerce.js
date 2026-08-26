import http from "k6/http";
import { check } from "k6";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3015";

export const options = {
  scenarios: {
    browse_and_search: {
      executor: "constant-arrival-rate",
      rate: 12,
      timeUnit: "1s",
      duration: "45s",
      preAllocatedVUs: 12,
      maxVUs: 30,
      exec: "browseAndSearch",
    },
    checkout_contention: {
      executor: "per-vu-iterations",
      vus: 20,
      iterations: 5,
      maxDuration: "45s",
      exec: "checkoutContention",
    },
  },
  thresholds: {
    "http_req_duration{surface:browse}": ["p(95)<1000"],
    "http_req_duration{surface:checkout}": ["p(95)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

const discoveryPaths = [
  "/en",
  "/en/search?q=rug",
  "/de/collections/synthetic-collection?sort=price-asc",
  "/ru/products/syn-04980",
];

export function browseAndSearch() {
  const path =
    discoveryPaths[Math.floor(Math.random() * discoveryPaths.length)];
  const response = http.get(`${baseUrl}${path}`, {
    tags: { surface: "browse" },
  });
  check(response, {
    "discovery is successful": (result) => result.status === 200,
    "discovery contains shop shell": (result) => result.body.includes("ÉPOCA"),
  });
}

export function checkoutContention() {
  const response = http.get(`${baseUrl}/en/checkout`, {
    tags: { surface: "checkout" },
  });
  check(response, {
    "checkout responds safely": (result) =>
      [200, 303, 307].includes(result.status),
  });
}
