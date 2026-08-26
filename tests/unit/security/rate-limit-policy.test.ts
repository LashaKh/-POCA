import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashRateLimitSubject,
  rateLimitCommandError,
  rateLimitPolicies,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

describe("central abuse policies", () => {
  it("covers every externally exposed domain with bounded values", () => {
    expect(Object.keys(rateLimitPolicies)).toEqual(
      expect.arrayContaining([
        "authSignIn",
        "contactSubmit",
        "uploadAuthorize",
        "checkoutAccept",
        "quoteSubmit",
        "returnSubmit",
        "paymentEvent",
        "newsletterSubscribe",
      ]),
    );
    for (const policy of Object.values(rateLimitPolicies)) {
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeLessThanOrEqual(86_400);
    }
  });

  it("hashes sensitive subjects with scope separation", () => {
    const pepper = "a-server-only-pepper-longer-than-twenty";
    const first = hashRateLimitSubject("auth", "buyer@example.test", pepper);
    const second = hashRateLimitSubject(
      "contact",
      "buyer@example.test",
      pepper,
    );
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
    expect(first).not.toContain("buyer");
  });

  it("maps denial to useful command and HTTP retry guidance", () => {
    const decision = { allowed: false, remaining: 0, retryAfterSeconds: 42 };
    expect(rateLimitCommandError(decision, "retry")).toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
      retryAfterSeconds: 42,
    });
    const response = rateLimitResponse(decision);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
  });
});
