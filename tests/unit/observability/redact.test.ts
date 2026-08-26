import { describe, expect, it } from "vitest";

import { redactForLog } from "@/lib/observability/redact";

describe("log redaction", () => {
  it("redacts forbidden keys recursively", () => {
    expect(
      redactForLog({
        event: "checkout",
        nested: { token: "secret", count: 1 },
      }),
    ).toEqual({ event: "checkout", nested: { token: "[redacted]", count: 1 } });
  });

  it("does not serialize raw Error content", () => {
    expect(redactForLog(new Error("database password leaked"))).toEqual({
      name: "Error",
      message: "[redacted-error]",
    });
  });
});
