import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  requireAssurance,
  requireManager,
  requireOwner,
} from "@/features/auth/authorization";
import { isSafeReturnPath, type ActorContext } from "@/features/auth/context";

const manager: ActorContext = {
  kind: "staff",
  profileId: "manager",
  role: "manager",
  active: true,
  assuranceLevel: "aal1",
  sessionState: "active",
};

describe("authorization", () => {
  it("allows an active Manager through the Manager boundary", () => {
    expect(requireManager(manager)).toBe(manager);
  });

  it("denies Owner work to a Manager", () => {
    expect(() => requireOwner(manager)).toThrowError(AuthorizationError);
  });

  it("requires aal2 when requested", () => {
    expect(() => requireAssurance(manager, "aal2")).toThrowError(
      "MFA_REQUIRED",
    );
  });

  it("rejects revoked staff sessions", () => {
    expect(() =>
      requireManager({ ...manager, sessionState: "revoked" }),
    ).toThrowError("SESSION_REVOKED");
  });

  it("rejects expired staff sessions at the command boundary", () => {
    expect(() =>
      requireManager({ ...manager, sessionState: "expired" }),
    ).toThrowError("SESSION_REVOKED");
  });
});

describe("safe return paths", () => {
  it.each(["/account", "/admin/products?status=draft", "/ka/search?q=rug"])(
    "accepts local path %s",
    (path) => expect(isSafeReturnPath(path)).toBe(true),
  );

  it.each([
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil",
    "javascript:alert(1)",
  ])("rejects unsafe path %s", (path) =>
    expect(isSafeReturnPath(path)).toBe(false),
  );
});
