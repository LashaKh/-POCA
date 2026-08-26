import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  signJobDispatch,
  verifyJobDispatch,
} from "@/features/operations/job-dispatch";

describe("signed background dispatch", () => {
  const secret = "test-only-worker-secret-at-least-twenty-characters";
  const body = '{"kind":"media-work"}';

  it("accepts a current exact body signature", () => {
    const signature = signJobDispatch(body, secret, 1_000);
    expect(
      verifyJobDispatch({
        body,
        secret,
        timestamp: "1000",
        signature,
        now: 1_100,
      }),
    ).toBe(true);
  });

  it("rejects replay, body mutation, and malformed signatures", () => {
    const signature = signJobDispatch(body, secret, 1_000);
    expect(
      verifyJobDispatch({
        body,
        secret,
        timestamp: "1000",
        signature,
        now: 1_301,
      }),
    ).toBe(false);
    expect(
      verifyJobDispatch({
        body: `${body} `,
        secret,
        timestamp: "1000",
        signature,
        now: 1_000,
      }),
    ).toBe(false);
    expect(
      verifyJobDispatch({
        body,
        secret,
        timestamp: "bad",
        signature: "bad",
        now: 1_000,
      }),
    ).toBe(false);
  });
});
