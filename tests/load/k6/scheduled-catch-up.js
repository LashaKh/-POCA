import http from "k6/http";
import { check, sleep } from "k6";

const invokeUrl =
  __ENV.SCHEDULED_INVOKE_URL ||
  "http://127.0.0.1:8888/.netlify/functions/scheduled-coordinator";
const readyUrl = __ENV.READY_URL || "http://127.0.0.1:3015/api/health/ready";
http.setResponseCallback(http.expectedStatuses(200, 202, 503));

export const options = {
  scenarios: {
    catch_up_burst: {
      executor: "shared-iterations",
      vus: 5,
      iterations: 10,
      maxDuration: "45s",
    },
  },
  thresholds: {
    "http_req_duration{surface:scheduler}": ["p(95)<25000"],
    checks: ["rate==1"],
  },
};

export default function scheduledCatchUp() {
  const invoked = http.post(invokeUrl, null, {
    tags: { surface: "scheduler" },
    timeout: "27s",
  });
  check(invoked, {
    "coordinator accepts or completes catch-up": (result) =>
      [200, 202].includes(result.status),
  });
  sleep(0.5);
  const ready = http.get(readyUrl, { tags: { surface: "scheduler-health" } });
  check(ready, {
    "readiness remains diagnosable": (result) =>
      [200, 503].includes(result.status),
  });
}
