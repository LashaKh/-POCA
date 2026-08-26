import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AuthorizationError,
  requireAssurance,
  requireManager,
  requireOwner,
  requireOwnerAssurance,
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

const localOwner: ActorContext = {
  kind: "staff",
  profileId: "owner",
  email: "owner@epoca.local",
  role: "owner",
  active: true,
  assuranceLevel: "aal1",
  sessionState: "active",
};

afterEach(() => vi.unstubAllEnvs());

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

  it("lets the explicit local preview Owner work without MFA", () => {
    vi.stubEnv("DEPLOY_ENV", "local");
    expect(requireOwnerAssurance(localOwner)).toBe(localOwner);
  });

  it("still requires MFA for the Owner outside the local preview", () => {
    vi.stubEnv("DEPLOY_ENV", "production");
    expect(() => requireOwnerAssurance(localOwner)).toThrowError(
      "MFA_REQUIRED",
    );
  });

  it("still requires MFA for non-preview Owner accounts locally", () => {
    vi.stubEnv("DEPLOY_ENV", "local");
    expect(() =>
      requireOwnerAssurance({ ...localOwner, email: "owner@epoca.test" }),
    ).toThrowError("MFA_REQUIRED");
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
